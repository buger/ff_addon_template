const {Cu} = require("chrome");

exports.test_modules = function(test) {
  // test that chrome.manifest was processed by checking that the resource://
  // URL registered in the manifest works.
  var obj = {};
  Cu.import("resource://jetpack_xul-res/module.jsm", obj);
  test.assertEqual(obj.exported_test, "foo");
};
