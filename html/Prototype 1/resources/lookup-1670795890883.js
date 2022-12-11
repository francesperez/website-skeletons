(function(window, undefined) {
  var dictionary = {
    "07cc8e46-1092-4d8b-997b-dd85382a11bf": "Home Page",
    "3322794d-8b87-4707-a1ac-70971e1c07ee": "About Us Mobile",
    "d12245cc-1680-458d-89dd-4f0d7fb22724": "Desktop Home Page",
    "6b6e05b3-e28e-42e2-b681-2a7d5dfa2302": "About Us",
    "f39803f7-df02-4169-93eb-7547fb8c961a": "Template 1",
    "bb8abf58-f55e-472d-af05-a7d1bb0cc014": "default"
  };

  var uriRE = /^(\/#)?(screens|templates|masters|scenarios)\/(.*)(\.html)?/;
  window.lookUpURL = function(fragment) {
    var matches = uriRE.exec(fragment || "") || [],
        folder = matches[2] || "",
        canvas = matches[3] || "",
        name, url;
    if(dictionary.hasOwnProperty(canvas)) { /* search by name */
      url = folder + "/" + canvas;
    }
    return url;
  };

  window.lookUpName = function(fragment) {
    var matches = uriRE.exec(fragment || "") || [],
        folder = matches[2] || "",
        canvas = matches[3] || "",
        name, canvasName;
    if(dictionary.hasOwnProperty(canvas)) { /* search by name */
      canvasName = dictionary[canvas];
    }
    return canvasName;
  };
})(window);