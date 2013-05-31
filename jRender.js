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
			this.createForms("#", json, "");
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

		createForms : function(root, _fragment, path) {
			var next_root;
			var me = this;
			var recognized_type;
			
			root = root.split("|")[0];
		
			if (path != "")
				path += "/";
			path += root;

			if (!_fragment.type) {
				recognized_type = this.getFormType(_fragment);
			} else {
				recognized_type = _fragment.type;
			}

			if (recognized_type == jRender.ARRAY) {
				var items;
				if (!_fragment.items){
					throw new Error("Please check your Schema");
				}
				if (_fragment.items.$ref) {
					//to enable cyclic reference handling and self reference handling
					//we render a button for every array and continue execution on button click
					var ref_path_parts = _fragment.items.$ref.split("/");
					var items = me.getRefSchema(ref_path_parts);
					next_root = ref_path_parts[ref_path_parts.length - 1];
					var $ref = ref_path_parts.slice(ref_path_parts.length - 2, 1);
					$ref = $ref.join("/");
					var button = new Button(next_root);
					$(button.html.find("button")).on("click", function(e) {
						e.preventDefault();
						var _tiny_fragment = _fragment;
						_tiny_fragment = items;
						me.createForms(next_root, _tiny_fragment, $ref);
						$(this.parentNode).append(me.forms[next_root].html.clone(true).addClass("indent"));
					});
					this.forms[root] = button;
					return button;
				} else {
					items = _fragment.items;
					next_root = items.title || root + "_items";
					var button_text = items.title || (root.split("_")[0] != "#" && root) || "Items";
					var button = new Button(button_text);
					$(button.html.find("button")).on("click", function(e) {
						e.preventDefault();
						var to_render;
						if (me.forms[next_root] instanceof jRender.UTILS["Form"])
							to_render = me.forms[next_root].html.clone(true).addClass("indent");
						else
							to_render = me.forms[next_root].html.clone(true);
						$(this.parentNode).append(to_render);
					});
					this.forms[root] = button;
					_fragment = items;
					this.createForms(next_root, _fragment, path);
					return button;
				}
			} else if (recognized_type == jRender.OBJECT) {

				var form = new Form(root);
				var properties = _fragment.properties;
				var sub_form;

				if (_fragment.$ref) {
					path = __updatePath__(path, _fragment.$ref);
					var isSelfReference = __detectSelfReferencing__(path, _fragment.$ref);
					var ref_path_parts = _fragment.$ref.split("/");
					next_root = ref_path_parts[ref_path_parts.length - 1];
					if (isSelfReference) {
						var html = __handleObjectSelfReference__(root, me.forms, next_root);
						this.forms[root] = html;
						return html;
					}
					_fragment = this.getRefSchema(ref_path_parts);
					var $ref = ref_path_parts.slice(ref_path_parts.length - 2, 1);
					$ref = $ref.join("/");
					sub_form = this.createForms(next_root, _fragment, $ref);
					form.html.append(sub_form.html);
				} else {
					for (var prop in properties) {
						next_root = prop;
						sub_form = this.createForms(next_root, properties[prop], path);
						form.html.append(sub_form.html);
					}
				}
				this.forms[root] = form;
				return form;
			} else {
				var field = new Field(root, _fragment.type);
				this.forms[root] = field;
				return field;
			}
		},

		display : function(hook) {
			$(hook).append(this.forms["#"].html.clone(true));
		}
	}

	var __handleObjectSelfReference__ = function(root, forms, next_root) {
		var html;
		var button = new Button(root);
		$(button.html.find("button")).on("click", function(e) {
			e.preventDefault();
			$(this.parentNode).append(forms[next_root].html.clone(true).addClass("indent"));
		});
		html = button;
		return html;
	}
	var __updatePath__ = function(path, $ref) {
		var ref_path_parts = $ref.split("/");
		var path_parts = path.split("/");
		for (var i = 0; i < ref_path_parts.length - 1; i++) {
			if (i < path_parts.length)
				path_parts[i] = ref_path_parts[i];
			else
				path_parts.push(ref_path_parts[i]);
		}
		return path_parts.join("/");
	};

	var __detectSelfReferencing__ = function(path, $ref) {
		if (path.indexOf($ref) != -1) {
			return true;
		}
		return false;
	};

	var Button = function(button_text, button) {
		if (!button) {
			var div = jQuery("<div>");
			button = jQuery("<button>").html("Add " + button_text);
			div.append(button);
		}
		this.html = div || button;
	};

	var Form = function(name) {
		this.name = name;
		this.html = jQuery("<div>");
	};

	var Field = function(name, type) {
		this.name = name;
		this.type = type;
		this.html = jQuery("<input>");
		this.html.attr("placeholder", this.name);
	};

	jRender.UTILS = {
		"Form" : Form,
		"Button" : Button,
		"Field" : Field,
		"__detectSelfReferencing__" : __detectSelfReferencing__,
		"__updatePath__" : __updatePath__
	};

	jRender.fn.init.prototype = jRender.prototype;

	window.jRender = jRender;

})(window);
