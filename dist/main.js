'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var uglify = require('uglify-js');

var FUNCTION_COMPRESS_OPTIONS = {};

/**
 *
 * @param {*} data
 * @param {Boolean} options.safe works in safe mode, so will not throws exception for circularity; default false
 * @param {String} options.endline end line with; default '\n'
 * @param {String} options.spacing indentation string; default '  ' (two spaces)
 * @param {String} options.keyQuote character used for quote keys; default null - no quotes
 * @param {String} options.valueQuote character used for quote values; default "
 * @param {Boolean} options.keySpace add space after key: ; default false
 * @param {function(key:String, value:*)} options.replace replace by key or value
 * @param {function(key:String, value:*)} options.filter filter by key or value
 * @param {Boolean} options.discard discard null and undefined values; default false
 * @param {Boolean} options.compress compress data like function, Date, Buffer; default false
 */
var stringify = function stringify(data, options) {
  var __done = [];
  var __keySpace = void 0;

  var __options = function __options() {
    if (!options) {
      // default options
      options = {
        endline: '\n',
        spacing: '  ',
        keyQuote: null,
        keySpace: false,
        valueQuote: '"',
        safe: false,
        replace: null,
        filter: null,
        discard: false,
        compress: false
      };
    } else {
      if (!options.endline && options.endline !== '') {
        options.endline = '\n';
      }
      if (!options.spacing && options.spacing !== '') {
        options.spacing = '  ';
      }
      if (!options.valueQuote) {
        options.valueQuote = '"';
      }
      if (options.replace !== undefined && typeof options.replace !== 'function') {
        throw new Error('options.replace is not a function');
      }
      if (options.filter !== undefined && typeof options.filter !== 'function') {
        throw new Error('options.filter is not a function');
      }
    }

    __keySpace = options.keySpace ? ' ' : '';
  };

  var __replace = function __replace(str, find, replace) {
    if (str.indexOf(find) === -1) {
      return str;
    }
    return str.split(find).join(replace);
  };

  var __circularity = function __circularity(val, path) {
    if (__done.indexOf(val) !== -1) {
      if (!options.safe) {
        throw new Error('Circular reference @ ' + path);
      }
      return true;
    }
    __done.push(val);
    return false;
  };

  var __serialize = {
    function: function _function(obj) {
      if (options.compress) {
        var _min = void 0;
        try {
          _min = uglify.minify(obj.toString(), FUNCTION_COMPRESS_OPTIONS);
          return _min.code;
        } catch (e) {
          console.warn('unable to compress function', obj.toString(), _min.error);
          return obj.toString();
        }
      }
      return obj.toString();
    },
    number: function number(obj) {
      return obj;
    },
    string: function string(obj) {
      if (obj.indexOf('\n') !== -1) {
        obj = obj.split('\n').join('\\n');
      }
      return __quote(obj, options.valueQuote);
    },
    boolean: function boolean(obj) {
      return obj ? 'true' : 'false';
    },
    null: function _null() {
      return 'null';
    },
    undefined: function undefined() {
      return 'undefined';
    },
    deferred: function deferred(obj) {
      return obj.toString();
    },
    date: function date(obj) {
      if (options.compress) {
        return 'new Date(' + obj.getTime() + ')';
      }
      return 'new Date(' + options.valueQuote + obj.toISOString() + options.valueQuote + ')';
    },
    regexp: function regexp(obj) {
      return obj.toString();
    },
    buffer: function buffer(obj) {
      // @todo check nodejs version?
      return 'Buffer.from(' + options.valueQuote + obj.toString('base64') + options.valueQuote + ')';
    },
    object: function object(obj, deep, path) {
      if (!path) {
        path = '[Object]';
      }

      var _spacing0 = __spacing(deep);
      var _spacing1 = _spacing0 + options.spacing;

      if (__circularity(obj, path)) {
        return options.endline + _spacing1 + '[Circularity]' + options.endline + _spacing0;
      }

      var _out = [];
      for (var key in obj) {
        var _path = path + '.' + key;
        var _item2 = __item(key, obj[key], deep + 1, _path);

        // if item is discarded by filtering
        if (!_item2) {
          continue;
        }

        // wrap strange key with quotes
        if (_item2.key && !_item2.key.match(/^\w[\d\w_]*$/)) {
          _item2.key = __quote(key, options.keyQuote || '"');
        }
        _out.push(options.endline + _spacing1 + _item2.key + ':' + __keySpace + _item2.value);
      }
      return '{' + _out.join(',') + options.endline + _spacing0 + '}';
    },
    array: function array(_array, deep, path) {
      if (!path) {
        path = '[Array]';
      }

      if (__circularity(_array, path)) {
        return '[Circularity]';
      }

      var _spacing0 = __spacing(deep);
      var _spacing1 = _spacing0 + options.spacing;

      var _out = [];
      for (var i = 0; i < _array.length; i++) {
        var _path = path + '#' + i;
        var _item3 = __item(null, _array[i], deep + 1, _path);
        if (_item3) {
          _out.push(options.endline + _spacing1 + _item3.value);
        }
      }
      return '[' + _out.join(',') + options.endline + _spacing0 + ']';
    }
  };

  var __spacing = function __spacing(deep) {
    var _spacing = '';
    for (var i = 0; i < deep - 1; i++) {
      _spacing += options.spacing;
    }
    return _spacing;
  };

  var __quote = function __quote(value, quote) {
    return quote + __replace(value, quote, '\\' + quote) + quote;
  };

  var __item = function __item(key, value, deep, path) {
    if (!deep) deep = 1;

    if ((options.discard || options.compress) && (value === undefined || value === null)) {
      return null;
    }

    if (options.filter && !options.filter(key, value)) {
      return null;
    }

    if (options.replace) {
      var _options$replace = options.replace(key, value);

      key = _options$replace.key;
      value = _options$replace.value;
    }

    var _type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
    if (_type === 'object') {
      if (value instanceof Array) {
        _type = 'array';
      } else if (value instanceof Date) {
        _type = 'date';
      } else if (value instanceof RegExp) {
        _type = 'regexp';
      } else if (value instanceof Buffer) {
        _type = 'buffer';
      } else if (value instanceof stringify._deferred) {
        _type = 'deferred';
      } else if (value === null) {
        _type = 'null';
      }
    }

    return { key: key, value: __serialize[_type](value, deep, path) };
  };

  __options();
  var _item = __item(null, data);
  return _item ? _item.value : {};
};

// deferred type
stringify.deferred = function (val) {
  this.val = val;
  return new stringify._deferred(val);
};

stringify._deferred = function (val) {
  this.val = val;
};

stringify._deferred.prototype.toString = function () {
  return this.val;
};

// prepared options
stringify.options = {
  json: {
    keyQuote: '"',
    keySpace: true
  },
  standardjs: {
    keySpace: true,
    valueQuote: "'"
  },
  compact: {
    valueQuote: "'",
    endline: '',
    spacing: ''
  }
};

module.exports = stringify;