(function(window) {

	var jRender = function(json) {
		return new jRender.fn.init(json);
	};

	jRender.ARRAY = "array";
	jRender.OBJECT = "object";
	jRender.INPUT = "input";

	jRender.fn = jRender.prototype = {
		init : function(json) {

			if ( typeof (json) === "undefined")
				json = {};

			this.schema = json;
			this.root_type = json.type || this.getFormType(json);
			this.root = "#";
			this.forms = {};
			this.createForms("#", json);
		},

		getRefSchema : function(ref_path_parts) {
			var ref_schema = null;

			//assuming that index 0 is going to be # everytime
			ref_schema = this.schema;
			for (var i = 1; i < ref_path_parts.length; i++) {
				ref_schema = ref_schema[ref_path_parts[i]];
			}
			return ref_schema;
		},

		getFormType : function(_fragment) {
			var type;
			if (_fragment.items) {
				type = jRender.ARRAY;
			} else if (_fragment.properties) {
				type = jRender.OBJECT;
			} else if (_fragment.$ref) {
				var ref_path_parts = _fragment.$ref.split("/");
				_fragment = this.getRefSchema(ref_path_parts);
				type = this.getFormType(_fragment);
			}

			if (!type || (type).trim() == "") {
				throw new Error("Cannot determine type of form");
			}

			return type;
		},

		createForms : function(root, _fragment) {
			var next_root;
			var me = this;
			var recognized_type;

			if (!_fragment.type) {
				recognized_type = this.getFormType(_fragment);
			} else {
				recognized_type = _fragment.type;
			}

			if (recognized_type == jRender.ARRAY) {
				var items;
				if (_fragment.$ref) {
					var ref_path_parts = _fragment.$ref.split("/");
					items = this.getRefSchema(ref_path_parts);
					next_root = ref_path_parts[ref_path_parts.length - 1];
					_fragment = items;
					this.forms[root] = this.createForms(next_root, _fragment);
				} else {
					items = _fragment.items;
					next_root = items.title || root + "_items";
					var button_text = items.title || (root.split("_")[0] != "#" && root) || "Items";
					
					var button = new Button(button_text);
					button.html.on("click", function(e) {
						e.preventDefault();
						$(this.parentNode).append(me.forms[next_root].html.clone(true).addClass("indent"));
					})
					this.forms[root] = button;
					_fragment = items;
					this.createForms(next_root, _fragment);
					return button;
				}
			} else if (recognized_type == jRender.OBJECT) {

				var form = new Form(root);
				var properties = _fragment.properties;
				var sub_form;

				if (_fragment.$ref) {
					var ref_path_parts = _fragment.$ref.split("/");
					next_root = ref_path_parts[ref_path_parts.length - 1];
					_fragment = this.getRefSchema(ref_path_parts);
					sub_form = this.createForms(next_root, _fragment);
					form.html.append(sub_form.html);
				} else {
					for (var prop in properties) {
						next_root = prop;
						sub_form = this.createForms(next_root, properties[prop]);
						form.html.append(sub_form.html);
					}
				}
				this.forms[root] = form;
				return form;
			} else {
				var field = new Field(root, _fragment.type);
				return field;
			}
		},

		display : function(hook) {
			$(hook).append(this.forms["#"].html);
		}
	}

	var Button = function(button_text) {
		var button = jQuery("<button>").html("Add " + button_text);
		this.html = button;
	}
	var Form = function(name) {
		this.name = name;
		this.html = jQuery("<div>");
	}
	var Field = function(name, type) {
		this.name = name;
		this.type = type;
		this.html = jQuery("<input>");
		this.html.attr("placeholder", this.name);
	}

	jRender.UTILS = {
		"Form" : Form,
		"Button" : Button,
		"Field" : Field
	}

	jRender.fn.init.prototype = jRender.prototype;

	window.jRender = jRender;

})(window);

/*(function(window) {
 var jRender = function(json) {
 return new jRender.fn.init(json);
 }

 jRender.fn = jRender.prototype = {
 init : function(json) {
 if (typeof(json)==="undefined")
 json = {};

 this.schema = json;
 this.root = this.schema.title;
 this.forms = {};
 this.createForms(json);
 },

 getRefSchema : function(ref) {
 var ref_path_parts = ref.split("/");
 var ref_schema = null;

 //assuming that index 0 is going to be # everytime
 ref_schema = this.schema;
 for (var i = 1; i < ref_path_parts.length; i++) {
 ref_schema = ref_schema[ref_path_parts[i]];
 }
 return ref_schema;
 },

 createForms : function(json, prop_name, type) {
 json.type && ( type = json.type);

 var form = null;

 var ref = json.$ref || (json.items && json.items.$ref) || null;
 var ref_schema = null;

 if (ref && ref != "#") {
 ref_schema = this.getRefSchema(ref);
 !type && ( type = ref_schema.type);
 }
 var title = (ref_schema && ref_schema.title) || prop_name || json.title;

 if (ref && ref == "#") {
 type = type || this.schema.type;
 title = this.root;
 }

 if (type == "array") {

 form = jQuery("<div>");
 if (!this.forms[title])
 this.forms[title] = {};
 if (this.forms[title] && !this.forms[title].button) {
 var button = this.renderButton((json.items && json.items.title) || title);
 this.forms[title].button = button;
 } else {
 button = this.forms[title].button.clone(true).html("Add " + prop_name);
 }
 form.append(button);
 if (ref != "#")
 this.forms[title].html = this.createForms((ref_schema || json.items), prop_name, json.items.type);
 return form;

 } else if (type == "object") {
 if (ref != "#") {
 form = jQuery("<div>");
 var h4 = jQuery("<h4>").html(title);
 form.append(h4);
 this.forms[title] = {};

 var properties = (ref_schema && ref_schema.properties) || json.properties;
 for (var prop in properties) {
 form.append(this.createForms(properties[prop], prop));
 }

 this.forms[title].html = form;
 return form;
 } else {
 var me = this;
 var button = null;
 form = jQuery("<div>");
 if (!this.forms[title])
 this.forms[title] = {};
 if (this.forms[title] && !this.forms[title].button) {
 button = this.renderButton((json.items && json.items.title) || title);
 this.forms[title].button = button;
 } else {
 button = this.forms[title].button.clone().html("Add " + prop_name);
 button.on("click", function() {
 var parent = this.parentNode;
 $(parent).empty();
 $(parent).append(me.forms[title].html.clone(true).addClass("indent"));
 });
 }
 form.append(button);
 return form;
 }
 } else {

 form = jQuery("<input>");
 form.attr("placeholder", title);
 return form;

 }
 },

 renderButton : function(title) {
 var me = this;

 var button = jQuery("<button>").html("Add " + title);
 button.on("click", function() {
 $(this.parentNode).append(me.forms[title].html.clone(true).addClass("indent"));
 });

 return button;
 }
 }

 jRender.fn.init.prototype = jRender.prototype;

 window.jRender = jRender;

 })(window);
 */