/*!
 * Copyright 2013 Justinmind. All rights reserved.
 */

(function(window,undefined) {
  jQuery.extend(jimEvent.fn, {
    /*************************** START SUPPORT FUNCTIONS ***************************/
    "launchCases": function(cases) {
      if (jimUtil.exists(cases) && cases.length) {
        try {
          this.event.stopPropagation();
          this.executeCases(cases);
        } catch (error) {
          switch(error.name) {
            case "ReferenceError":
            case "TypeError":
              if(error.fileName) {
                jimUtil.debug(error.message + " [file: '" + error.fileName.substring(error.fileName.lastIndexOf("/")+1) + "' at line: " + error.lineNumber + "]");
              } else {
                jimUtil.debug(error.message);
              }
              break;
            default:
              jimUtil.debug(error);
              break;
          }
        }
      }
    },
    "executeCases": function(cases) {
      var newCases = this.getElementsToExecute(cases);
      var self = this;
      if(newCases.length === 0)
    	return;
      else {
    	var len = newCases.length;
  		var remainingCases = cases.slice(len);
  		var leftToResolve = len;
    	var caseCallback = function() {
    	  leftToResolve--;
      	  if (leftToResolve === 0 && remainingCases.length > 0) {
      	    self.executeCases(remainingCases);
      	  }
    	};

        if(newCases.length === 1) {
      	  var currentCase = newCases.splice(0,1)[0];
    	  if(jimUtil.exists(currentCase)) {
            self.executeBlocks(currentCase.blocks, caseCallback);
    	  }
        }
        else {
          var i, bLen, current, maxDelay = 0;
          for(i = 0, bLen=newCases.length; i<bLen; i+=1) {
            current = newCases[i];
            maxDelay += current.delay;
            (function(caze) {
        	  jimEvent.pauseStack.push(setTimeout(function(){self.executeBlocks(caze.blocks, caseCallback)}, maxDelay));
            })(current);
          }
        }
	  }
    },
    "getElementsToExecute": function(elements) {
  	  var a, aLen, b, bLen, actionType, current;
        var array = [];
        for(a=0, aLen=elements.length; a<aLen; a+=1) {
      	current = elements[a];
          actionType = (elements[a+1] !== undefined) ? elements[a+1].exectype : null;
          if(actionType === null || actionType === "serial") {
            array.push(current);
            break;
          }
          else {
            for(b=a, bLen=elements.length; b<bLen; b+=1) {
          	  current = elements[b];
          	  actionType = (elements[b+1] !== undefined) ? elements[b+1].exectype : null;
          	  if(actionType === "parallel" || actionType === "timed") {
          	    array.push(elements[b]);
          	  }
          	  else {
          	    array.push(elements[b]);
          	    break;
          	  }
            }
            break;
          }
        }
        return array;
  	},
    "undoCases": function($firer) {
      var self = this, undoPauseStack, undoStack, newUndoStack, $eventFirer, undoAction, undoType, c, cLen, doRestore = true;
      newUndoStack = [];
      self.event.stopPropagation();
      if(self.event.type === "mouseleave") {
	    if(self.event.toElement)
			$eventFirer = jQuery(self.event.toElement);
		else
        	$eventFirer = jQuery(document.elementFromPoint(self.event.clientX, self.event.clientY)); /* intentional use of clientX/clientY instead of pageX/pageY */       
		if($firer.has($eventFirer).length !== 0) {
          doRestore = false;
        }
      }
      if(doRestore) {
        undoPauseStack = $firer.data("jimUndoPauseStack");
        if(jimUtil.exists(undoPauseStack)) {
          while(undoPauseStack.length) {
            clearTimeout(undoPauseStack.pop());
          }
          $firer.removeData("jimUndoPauseStack");
        }

        undoStack = $firer.data("jimUndoStack");
        if(jimUtil.exists(undoStack)) {
          for(c=0, cLen=undoStack.length; c<cLen; c+=1) {
          	for(iAction=0, iActionLen=undoStack[c].action.length; iAction<iActionLen; iAction+=1) {
	            undoAction = undoStack[c].action[iAction];
	            undoType = undoStack[c].type;
	            if(undoAction.action && undoAction.parameter && (undoType == self.event.type || (undoType == "mouseenter" || undoType == "mouseover") && self.event.type == "mouseleave")) {
	              jimEvent.fn[undoAction.action].call(self, undoAction.parameter);
	            } else if(undoAction.action && undoAction.parameter){
	            	newUndoStack.push(undoStack[c]);
	            }
            }
          }
        }
        if(newUndoStack.length == 0) $firer.removeData("jimUndoStack");
        else $firer.data("jimUndoStack", newUndoStack);
      }
    },
    "executeBlocks": function(blocks, caseCallback) {
      if(jimUtil.exists(blocks)) {
        var self = this, b, bLen, block, condition;
        /* simulates if-elseif-else construct -> only once block is executed */
        for(b=0, bLen=blocks.length; b<bLen; b+=1) {
          block = blocks[b];
          if(jimUtil.exists(block.condition)) {
            condition = self.evaluateExpression(block.condition);
            if(condition !== null) {
              if(block.condition.datatype && block.condition.datatype === "variable") {
                condition = jimEvent.tryBooleanConversion(condition);
              } else if(typeof(condition) === "string") {
                condition = confirm(condition);
              }
              if(condition === true) {
                self.executeActions(block.actions, caseCallback);
                return;
              }
            }
            /* continue with next block */
          } else if (block.condition === null) {
            /* continue with next block */
          } else {
            self.executeActions(block.actions, caseCallback);
            return;
          }
        }

        /* no block executed, proceed with next case */
        if(caseCallback) { caseCallback(); }
      }
    },
    "executeActions": function(actions, caseCallback) {
      if(jimUtil.exists(actions)) {
    	//preprocess actions
    	var self = this, a, aLen, b, bLen, $firer, undo, undoStack, lastUndoAction, current, maxDelay;
    	var array = self.getElementsToExecute(actions);

    	// save undo state
    	for (a=0, aLen=array.length;a<aLen; a+=1) {
    	  current = array[a];
    	  $firer = self.getEventFirer();
    	  if (self.event.backupState) {
		    /* initialise mouseover */
		    undo = {action: self.getUndoActions(current), type: self.event.type};
		    if(jimUtil.exists(undo) && !jQuery.isEmptyObject(undo)) {
		      undoStack = $firer.data("jimUndoStack");
		      if(!jimUtil.exists(undoStack)) { undoStack = []; }
		        $firer.data("jimUndoStack", undoStack.concat(undo));
		    }
		  } else if (current.action === "jimChangeStyle" && jimUtil.exists($firer.data("jimUndoStack"))) {
		    /* event in-between mouseenter and mouseleave of a mouseover */
			undoStack = $firer.data("jimUndoStack");
		    for(l = $firer.data("jimUndoStack").length-1; l >= 0; l -= 1) {
		      lastUndo = $firer.data("jimUndoStack")[l];
		      lastUndoAction = lastUndo.action[0];
		      /* if undos type is mouseenter and the undo target and current target are in the same */
		      /* if undos action type is ChangeStyle, then must be erased from the undo stack */
		      if(lastUndo.type === "mouseenter" && lastUndoAction.action === "jimChangeStyle"){
		    	for(undoTarget in lastUndoAction.parameter[0]){
		    	  for(currentTarget in current.parameter[0]){
		    		if(undoTarget === currentTarget){
		    		  undoStack.splice(l, 1);
		    		  $firer.data("jimUndoStack", undoStack);
		    		  break;		    			
		    		}
		    	  }
		    	}
		      }
		    }
		  }
		}

		var len = array.length;
		var remainingActions = actions.slice(len);
		var leftToResolve = len;
    	var actionCallback = function() {
    		leftToResolve--;
    	  if (leftToResolve === 0 && remainingActions.length > 0) {
    	    self.executeActions(remainingActions, caseCallback);
    	  }
    	  else if(leftToResolve === 0 && remainingActions.length === 0) {
    		 if(caseCallback) { caseCallback(); }
		  }
    	};
    	actions = [];
    	aLen = 0; /* terminate iteration */
    	maxDelay = 0;
    	for(b=0, bLen=len; b<bLen; b+=1) {
  		  current = array[b];
  		  maxDelay += current.delay;
  		  if (current.action === "jimNavigation") {
  			if(current.exectype === 'serial' && current.delay === 0)
				jimEvent.fn[current.action].call(self, current.parameter);
  			else {
	  		  (function(action) {
	  		   	jimEvent.pauseStack.push(setTimeout(function(){jimEvent.fn[action.action].call(self, action.parameter)}, maxDelay));
	  		  })(current);
  			}
  			break;
  		  }
  		  else if (current.action === "jimSetValue" || current.action === "jimSetSelection") {
  			if(current.exectype === 'serial' && current.delay === 0)
				jimEvent.fn[current.action].call(self, current.parameter, undefined, actionCallback);
  			else {
  			  (function(action) {
  				jimEvent.pauseStack.push(setTimeout(function(){jimEvent.fn[action.action].call(self, action.parameter, undefined, actionCallback)}, maxDelay));
  			  })(current);
  			}
  		  }
  		  else {
  			if(current.exectype === 'serial' && current.delay === 0)
			  jimEvent.fn[current.action].call(self, current.parameter, actionCallback);
			else {
	  		  (function(action) {
	  			jimEvent.pauseStack.push(setTimeout(function() {jimEvent.fn[action.action].call(self, action.parameter, actionCallback)}, maxDelay));
	  		  })(current);
			}
  		  }
      	}
	  }
    },
    "getEventFirer": function(event) {
      var self = this, $firer, myEvent;
      myEvent = event || self.event;
      if(window.jimDevice.isMobile()) {
    	if(jimDevice.tool==="pinch" && (myEvent.type!=="pinchopen" && myEvent.type!=="pinchclose"))
    		return jQuery("#jim-mobile");
    	if(jimDevice.tool==="rotate" && (myEvent.type!=="rotateleft" && myEvent.type!=="rotateright"))
    		return jQuery("#jim-mobile");
      }
      $firer = jQuery(myEvent.target || myEvent.srcElement);
      switch(myEvent.type) {
        case "keyup":
        case "keydown":
            if($firer.is("html, body")) {
              $firer = jQuery("."+myEvent.type);
            } else if ($firer.is("[type='button'],[type='checkbox'],[type='file'],[type='hidden'],[type='image'],[type='password'],[type='radio'],[type='reset'],[type='submit'],[type='text'],[type='number'],[type='url'],[type='email'],select,textarea,button")) {
              $firer = $firer.closest(".firer");
            }
            break;
        case "variablechange":
	        if($firer.is("html")) {
	          $firer = jQuery("."+myEvent.type);
	        }
	        break;
        default:
            if ($firer.hasClass("dateicon") || $firer.hasClass("timeicon")) {
              $firer = $firer.prev();
            } else if($firer.parent().closest(".shapewrapper").length==1){
              $firer = $firer.parent().closest(".shapewrapper").find(".shape");
            } else {
              $firer = $firer.closest(".firer");
            }
            break;
      }


      return $firer;
    },

    "getDirectEventFirer": function(firer) {
      var $firer = jQuery(firer);

      if($firer.parent().closest(".shapewrapper").length==1){
        $firer = $firer.parent().closest(".shapewrapper").find(".shape");
      }

      return $firer;
    },

	"getEventTargets": function(targets, instance, actionType) {
	  var self = this;
	  var results = [];
	  for (var i = 0; i < targets.length; ++i) {
	    var result = self.getEventTarget(targets[i], instance, actionType);
	    if ((typeof result) == "string") {
	      results.push(result);
	    } else {
	      if (result.length > 1) {
	        for (var j = 0; j < result.length; ++j)
		      results.push($(result[j]));
		  }
	      else if (result.length == 1)
		    results.push($(result[0]));
	    }
	  }
	  return results;
	},

    "getEventTarget": function(target, instance,actionType) {
      var self = this, $target, $firer, $parents, $masterTarget, masteritemID, result;
      if(target instanceof jQuery) {
        return target;
      } else {
        if(jimData && jimData.variables.hasOwnProperty(target)) {
          return target;
        } else {
          $target = jQuery(target);
          if($target.length) {
            $firer = self.getEventFirer();

            if($target.attr("class") && ($target.attr("class").indexOf("shape") > -1) && $target.closest(".shapewrapper").length > 0 && $target.closest(".content").length == 0) {
                var $target = $target.closest(".shapewrapper");
//                //get ALL elements with same id
//                $target =$("[id="+$wrapper.prop('id')+"]");
            }
            if($firer.attr("class") && ($firer.attr("class").indexOf("shape") > -1) && $firer.closest(".shapewrapper").length > 0) {
                $firer = $firer.closest(".shapewrapper");
            }
            if($target.parent().closest(".datalist, .datagrid").length) {
              if($target.closest(".headerrow").length)
              	return $target;
              if($firer.closest(".datalist, .datagrid").length) {
                if($firer.closest(".headerrow").length) {
                  if($target.is(".datarow"))
                    return $firer.closest(".headerrow").parent().next().children(".datarow");
                  else
                    return $firer.closest(".headerrow").parent().next().children(".datarow").find(target);
                } else {
                  if($target.hasClass("datarow")) {
                    if(typeof(target) === "string" && target.lastIndexOf(".odd") !== -1) {
                      return $firer.closest(".datalist").find("table:first").children("tbody").children(".odd").children(".datacell");
                    } else if (typeof(target) === "string" &&  target.lastIndexOf(".even") !== -1) {
                      return $firer.closest(".datalist").find("table:first").children("tbody").children(".even").children(".datacell");
                    } else {
                      if (jimUtil.exists(actionType) && actionType==="jimResize") {
                        return $firer.closest(".datarow");
                      }else{
                        return $firer.closest(".datarow").children("td.datacell");
                      }
                    }
                  } else {
                    /* 2 different target selectors (depending on action):
                     * - changeStyle -> jQuery(#canvas #component) uses jQuery object
                     * - otherAction -> "#component" uses String
                     */
                	 var $parentsAndSelf = $firer.parents(".datarow:first,.gridcell:first").andSelf();

                     if($parentsAndSelf.filter($target).length > 0)
                    	 return $parentsAndSelf.filter($target);
                     else if($parentsAndSelf.filter(target).length > 0)
                    	 return $parentsAndSelf.filter(target);

                     if($parentsAndSelf.find($target).length > 0)
                        return $parentsAndSelf.find($target);
                     else
                        return $parentsAndSelf.find(target);
                  }
                }
              } else {
                if (jimUtil.exists(instance)) {
                	var $dataView = jQuery($target.get(0)).closest(".datalist, .datagrid");
                	if($dataView.is(".datagrid")){
                		return $dataView.find(".gridcell[instance='" + instance.id + "']").find(target);
                	}else{
                		return $dataView.find("input[name='id'][value='"+instance.id+"']").closest(".datarow").find(target);
                	}
                } else {
                  if($target.hasClass("datarow")) {
                    if(typeof(target) === "string" && (target.lastIndexOf("tr.odd") !== -1 || target.lastIndexOf("tr.even") !== -1)) {
                      return $target.children(".datacell");
                    } else {
                      return $target.parents(".datalist").find(".datarow");
                    }
                  } else {
                	  /* 2 different target selectors (depending on action): 
                       * - changeStyle -> jQuery(#canvas #component) uses jQuery object
                       * - otherAction -> "#component" uses String 
                       */ 
                     var $newTarget = $target.parents(".datarow, .datagrid, .datalist").find($target);
                     if($newTarget.length > 0)
                        return $newTarget;
                     else{
                        return $target.parents(".datarow, .datagrid").find(target); 
                     }
                  }
                }
              }
            } else if ($firer.hasClass("menunode") && $firer.parent().closest(".submenu").length) {
              masteritemID = $firer.parent().closest(".submenu").attr("masteritem");
              if(masteritemID) {
                if(typeof(target) === "string") {
                  $target = jQuery("#"+masteritemID).find(target.split(" ").join(","));
                } else if (jimUtil.isArray(target)) {
                  $target = jQuery("#"+masteritemID).find(target.join(","));
                }
              }
              return $target;
            } else {
              return $target;
            }
          }
        }
      }
    },
    "getUndoActions": function(action) {
      var self = this, actionType = action.action, undoActions=[], undoAction, $targets, $target, target, type, len, isReadonly, style, s, undoStyle, property, t, tLen, bShape;
      switch(actionType) {
        case "jimChangeStyle":
          undoAction = {
            "action": "jimChangeStyle",
            "parameter": []
          };
          for(s=0, len=action.parameter.length; s<len; s+=1) {
            style = action.parameter[s];
			
			if (style.effect != null) {
				var effects = style.effect;
				undoAction.parameter.push(style);
				continue;
			}
			
			for(t=0, tLen=style.target.length; t<tLen; t+=1) {
            	target = style.target[t];
                $target = self.getEventTarget(target);
                if($target) {
                  //check if shape
                  bShape=false;
                  if($target.jimGetType() === itemType.shapewrapper){
                      $target = $target.find(".shape");
                      bShape=true;
                  }
                  undoStyle = {};
                  undoStyle.target = [ target ];
                  if(style.attributes) {
                    undoStyle.attributes = {};
                    for(property in style.attributes) {
                      if(style.attributes.hasOwnProperty(property)) {
                          var i=property.indexOf('#');
                          if(i!=-1){
                            property=property.substring(0,i);
                          }
                          if(bShape){
                        	if (property == "background-color" && $target.shapeStyle("background-image").indexOf("linear-gradient") !== -1) 
                        		undoStyle.attributes["background-image"] = $target.shapeStyle("background-image");
                        	else
                        		undoStyle.attributes[property] = $target.shapeStyle(property);
                          }
                          else{
                        	if (property == "overlay")
                        	  undoStyle.attributes[property] = $target.closest("div.image").attr("overlay");
                        	else if (property == "background-color" && $target.css("background-image").indexOf("linear-gradient") !== -1) {
                        	  undoStyle.attributes["background-image"] = $target.css("background-image");
                        	}
							else if (property.indexOf("border") !== -1 && property.indexOf("color") !== -1){
								undoStyle.attributes[property] = $target.css(property);
								jimUtil.borderColorChangedUndo($target,property,undoStyle.attributes);
							}
                        	else
                        	  undoStyle.attributes[property] = $target.css(property);
                          }
                      }
                    }
                  }
                  if(style.expressions) {
                    undoStyle.expressions = {};
                    for(property in style.expressions) {
                      if(style.expressions.hasOwnProperty(property)) {
                        undoStyle.expressions[property] = $target.css(property);
                      }
                    }
                  }
                  undoAction.parameter.push(undoStyle);
                }
            }
          }
          undoActions.push(undoAction);
          break;
        case "jimChangeCursor":
          undoAction = {
            "action": "jimChangeCursor",
            "parameter": {
	          "type": $("#simulation").css("cursor")
			}
          };
          undoActions.push(undoAction);
          break;
        case "jimPlayAudio":
		  undoAction = {
              "action": "jimStopAudio",
              "parameter": {
                "target": [action.parameter.target]
              	}
              };
          undoActions.push(undoAction);
          break;
        case "jimStopAudio":
		  var audioElement = $("audio").last();
		  if(audioElement != null && audioElement !== undefined){
			  var targetAudio = audioElement.attr("id");
		      undoAction = {
              "action": "jimPlayAudio",
              "parameter": {
                "target": [targetAudio]
              	}
              };
              undoActions.push(undoAction);
		  }
          break;
        case "jimNavigation":
          break;
        default:
          if(action.parameter.variable){
        	  $targets = self.getEventTargets(action.parameter.variable);
        	  var isVariable = true;
          } else{ $targets = jQuery(action.parameter.target); }
          for(t=0, tLen=$targets.length; t<tLen; t+=1) {
            $target = this.getEventTarget(jQuery($targets[t]));
            type = $target.jimGetType();
            switch(actionType) {
              case "jimRotate":
              var angle =jimUtil.getRotationDegrees(self.getEventTarget($target));
              if(action.parameter.angle.type=="rotateby")
              	angle = -action.parameter.angle.value;
            undoAction = {
                  "action": "jimRotate",
                  "parameter": {
                    "angle": {
                "value": angle,
                "type":action.parameter.angle.type
              },
                    "target": $target
                  }
                };
                if(action.parameter.effect)
                   jQuery.extend(undoAction.parameter,{"effect": action.parameter.effect});
            undoActions.push(undoAction);
            break;
              case "jimSetValue":
                /* store actual values */
                if(isVariable){
                	var value = (self.jimGetValue(self.getEventTarget($target)) == undefined) ? "" : self.jimGetValue(self.getEventTarget($target));
                	$target = $targets[t];
                	undoAction = {
                        "action": "jimSetValue",
                        "parameter": {
                          "value": value,
                          "variable": [$target]
                        }
                      };
                } else {
	                undoAction = {
	                  "action": "jimSetValue",
	                  "parameter": {
	                    "value": self.jimGetValue(self.getEventTarget($target)),
	                    "target": $target
	                  }
	                };
                }
                undoActions.push(undoAction);
                /* store selection values */
                switch(type) {
                  case itemType.selectionlist:
                  case itemType.multiselectionlist:
                  case itemType.radiobuttonlist:
                  case itemType.checkboxlist:
                    undoActions.push(self.getUndoActions({"action": "jimSetSelection", "parameter": {"target": action.parameter.target}})[0]);
                    break;
                  case itemType.image:
                	if (!($target.html().indexOf("preserveAspectRatio=\"none\"") > -1)) undoAction.parameter.aspectratio = "true";
                	if(undoAction.parameter.value.endsWith(".svg")) {
                		undoAction.parameter.value = $target.find("svg").parent().html();
                	}
                	break;
                  case itemType.checkbox:
                	if (self.getEventFirer()!=null && self.getEventFirer()[0]==$target[0] && self.event.type=="click"){//if event firer is a click(toggle) on a checkbox, it's value had already changed when building the undo actions 
                		undoAction.parameter.value = !undoAction.parameter.value;
                	}
                	break;
                }
                break;
              case "jimSetSelection":
                undoAction = {
                  "action": "jimSetSelection",
                  "parameter": {
                    "value": self.jimGetSelectedValue(self.getEventTarget($target)),
                    "target": $target
                  }
                };
                undoActions.push(undoAction);
                break;
              case "jimHide":
                undoAction = jQuery.extend(true, {}, action);
                undoAction.action = "jimShow";
                undoActions.push(undoAction);
                break;
              case "jimShow":
                undoAction = jQuery.extend(true, {}, action);
                if($target.jimGetType() === itemType.panel) {
                  undoAction.parameter.target = $("#" + $target.siblings(":visible:first").attr("id"));
                  if(action.parameter.effect && action.parameter.effect.direction) {
                    switch(action.parameter.effect.direction){
                      case "left":
                        undoAction.parameter.effect.direction = "right";
                        break;
                      case "right":
                        undoAction.parameter.effect.direction = "left";
                        break;
                      case "up":
                        undoAction.parameter.effect.direction = "down";
                        break;
                      case "down":
                        undoAction.parameter.effect.direction = "up";
                        break;
                    }
                  }
                } else {
                  undoAction.action = "jimHide";
                }
                undoActions.push(undoAction);
                break;
              case "jimEnable":
              case "jimDisable":
                isReadonly = false;
                switch(type) {
                  case itemType.radiobuttonlist:
                  case itemType.checkboxlist:
                    isReadonly = $target.find('input[disabled]').length !== 0;
                    break;
                  case itemType.checkbox:
                  case itemType.radiobutton:
                    isReadonly = $target.is("[disabled]");
                    break;
                  case itemType.file:
                    isReadonly = $target.find("[disabled]").length !== 0;
                    break;
                  case itemType.text:
                  case itemType.password:
                    isReadonly = $target.find("[readonly]").attr("readonly");
                    break;
                  case itemType.date:
                  case itemType.time:
                    isReadonly = $target.find(".icon[readonly]").attr("readonly");
                    break;
                  default:
                    isReadonly = $target.attr("readonly");
                    break;
                }
                if(action.action === "jimDisable" && !isReadonly) {
                  undoAction = {
                    "action": "jimEnable",
                    "parameter": {
                      "target": action.parameter.target
                    }
                  };
                  undoActions.push(undoAction);
                } else if (action.action === "jimEnable" && isReadonly) {
                  undoAction = {
                    "action": "jimDisable",
                    "parameter": {
                      "target": action.parameter.target
                    }
                  };
                  undoActions.push(undoAction);
                }
                break;
              case "jimResize":
            	var widthExpr,heightExpr;
              	if($target.data("widthUnit")=="%")
              		widthExpr = {"type":"percentage","value":parseInt($target.data("width"))};
              	else
              		widthExpr =  {"type":"exprvalue","value":parseInt($target.outerWidth(),10)};

              	if($target.data("heightUnit")=="%")
              		heightExpr = {"type":"percentage","value":parseInt($target.data("height"))};
              	else
              		heightExpr =  {"type":"exprvalue","value":parseInt($target.outerHeight(),10)};

                undoAction = {
                  "action": "jimResize",
                  "parameter": {
                    "target": action.parameter.target,
                    "width": widthExpr,
                     "height": heightExpr
                  }
                };
                if(action.parameter.effect){
                	 jQuery.extend(undoAction.parameter,{"effect": action.parameter.effect});
                }
                undoActions.push(undoAction);
                break;
              case "jimMove":
            	  var horizontalType= "movetoposition";
            	  var verticalType = "movetoposition";
            	  var horizontalValue = parseInt(jimEvent.fn.jimGetPositionX($target),10);
            	  var verticalValue = parseInt(jimEvent.fn.jimGetPositionY($target),10);
              	  if(jimPin.getHorizontalPin(jQuery(action.parameter.target)) !== "none"){
              	  	horizontalType = "pin"+jimPin.getHorizontalPin(jQuery(action.parameter.target));
              	  	horizontalValue = jimPin.getHorizontalMargin(jQuery(action.parameter.target));
              	  }
              	  else if(action.parameter.left.type === "movebyoffset"){
                	horizontalType = action.parameter.left.type;
                  	horizontalValue = -action.parameter.left.value;
              	  }

              	  if(jimPin.getVerticalPin(jQuery(action.parameter.target)) !== "none"){
              	  	verticalType = "pin"+jimPin.getVerticalPin(jQuery(action.parameter.target));
              	  	verticalValue = jimPin.getVerticalMargin(jQuery(action.parameter.target));
              	  }
              	  else if(action.parameter.left.type === "movebyoffset"){
              		verticalType = action.parameter.top.type;
              		verticalValue = -action.parameter.top.value;
                  }


	              undoAction = {
	                "action": "jimMove",
	                "parameter": {
	                  "target": action.parameter.target,
	                  "top":{
	                      "type":verticalType,
	                      "value":verticalValue
	                   },
	                   "left":{
	                      "type":horizontalType,
	                      "value":horizontalValue
	                   }
	                }
	              };
	              if(action.parameter.effect){
	              	 jQuery.extend(undoAction.parameter,{"effect": action.parameter.effect});
	              }
	              undoActions.push(undoAction);
	              break;
            }
          }
          break;
      }
      return undoActions;
    },
    "triggerDragOver": function($target) {
      if(jimUtil.exists($target)) {
        var self = this, $activeOver, $over,t, tLen;
        for(t=0, tLen=$(self.event.currentTarget).data("jimDragTargets").length; t<tLen; t+=1) {
          $dragTarget = $(self.event.currentTarget).data("jimDragTargets")[t];
          $dragTarget.hide();
        }/* only works because drag event hijacks mouse events */
        var $overCandidates = $(".firer").not($(self.event.currentTarget));
        $activeOver = jQuery(document.elementFromPoint(self.event.clientX, self.event.clientY)).closest($overCandidates); /* TODO: :visible */ /* intentional use of clientX/clientY instead of pageX/pageY */
        for(t=0, tLen=$(self.event.currentTarget).data("jimDragTargets").length; t<tLen; t+=1) {
            $dragTarget = $(self.event.currentTarget).data("jimDragTargets")[t];
            $dragTarget.show();
          } /* would cause flicker otherwise */
        $over = (self.dragoverStack.length > 0) ? self.dragoverStack[self.dragoverStack.length-1] : $target;
        if($activeOver[0] !== $over[0]) {
          if($activeOver.hasClass("mouseenter")) {
            self.dragoverStack.push($activeOver);
            $activeOver.trigger("dragenter");
          }
          if($activeOver.hasClass("mouseleave") && !self.dragoverStack.contains($activeOver[0])) {
            self.dragoverStack.push($activeOver);
          } else if ($over.hasClass("mouseleave")) {
            self.dragoverStack.pop();
            $over.trigger("dragleave");
          }
        }
      }
    },
    "getGradientStyle": function(gradient) {
      var value;
      if(jQuery.browser.mozilla) {
        value = gradient["-moz"];
      } else if (jQuery.browser.webkit) {
        if(parseFloat(jQuery.browser.version) < 4.0) {
          value = gradient["-webkit-old"];
        } else {
          value = gradient["-webkit"];
        }
      } else if (jQuery.browser.opera) {
        value = gradient["-opera"];
      }
      return value;
    },
	"getNextStyle" : function(attribute, target, attributes) {
		if (attributes != null && attributes[attribute])
			return parseInt(attributes[attribute], 10);
		return this.getCurrentStyle(attribute, target);
	},
    "getCurrentStyle": function(attribute, target) {
      var style, $target = this.getEventTarget(target);
      if($target.length) {
        if(attribute==="stroke-width")
          style = $target.find(".firer").css(attribute);
        else style = (attribute.startsWith("Jim")) ? $target[0].style[attribute] : $target.css(attribute);
        try {
          return parseInt(style, 10);
        } catch(error) {
          return style;
        }
      }
      return style;
    },
    "evaluateExpression": function(expression, instance) {
      var self = this, result, tmpResult, $datarow,$gridcell, i, len;
      if(jimUtil.exists(expression)) {
        if(expression.action) {
          result = jimEvent.fn[expression.action].call(self, expression.parameter, instance);
        } else if(expression.field) {
          result = (jimUtil.exists(instance) && jimUtil.exists(instance.userdata) && instance.userdata.hasOwnProperty(expression.field)) ? instance.userdata[expression.field] : "";
        } else if (expression.datatype) {
          switch (expression.datatype) {
	        case "property":
	        	var $target = self.getEventTarget(expression.target, instance);
	        	result = jimEvent.fn[expression.property].call(self,$target);
	        	break;
	        case "variable":
	        	tmpResult = jimData.get(expression.element);
	        	if(jimUtil.isArray(tmpResult)) {
	        		result = [];
	        		for(i=0, len=tmpResult.length; i<len; i+=1) {
	        			result.push(tmpResult[i]);
	        		}
	        	} else {
	        		result = tmpResult;
	        	}
	        	break;
            case "datamaster":
              result = [];
              tmpResult = jimData.datamasters[expression.datamaster];
              if(tmpResult) {
	            for(i=0, len=tmpResult.length; i<len; i+=1) {
	              result.push(tmpResult[i]);
	            }
              }
              break;
            case "datalist":
              tmpResult = [];
              jQuery(expression.element).find(".datarow").each(function(index, datarow) {
                tmpResult.push(jQuery(datarow).find("input[name='id']").val());
              });
              result = self.getDataInstancesById(jimData.datamasters[expression.datamaster], tmpResult);
              break;

            case "datarow":
              $datarow = jQuery(self.event.target || self.event.srcElement).closest(".datarow");
              tmpResult = [];
              if ($datarow.length) {
                tmpResult = [$datarow.find("input[name='id']").val()];
              } else {
                jQuery(expression.element).find(".datarow").each(function(index, cell) {
                  tmpResult.push(jQuery(cell).find("input[name='id']").val());
                });
              }
              result = self.getDataInstancesById(jimData.datamasters[expression.datamaster], tmpResult);
              break;
            case "datagrid":
            	tmpResult = [];
            	jQuery(expression.element).find(".gridcell").each(function(index, gridcell) {
              		tmpResult.push(jQuery(gridcell).attr("instance"));
              	});
            	result = self.getDataInstancesById(jimData.datamasters[expression.datamaster], tmpResult);
            	break;
            case "gridcell":
            	$gridcell = jQuery(self.event.target || self.event.srcElement).closest(".gridcell");
            	tmpResult = [];
            	if ($gridcell.length) {
            		tmpResult = [$gridcell.attr("instance")];
            	} else {
            		jQuery(expression.element).find(".gridcell").each(function(index, cell) {
            			tmpResult.push(jQuery(cell).attr("instance"));
            		});
            	}
            	result = self.getDataInstancesById(jimData.datamasters[expression.datamaster], tmpResult);
            	break;
          }
        } else {
          result = expression;
        }
      }
      return result;
    }
    /**************************** END SUPPORT FUNCTIONS ****************************/
  });
})(window);
