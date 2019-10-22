'use strict';

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another PromiseNs, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function PromiseNs(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('PromiseNss must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('PromiseNs constructor\'s argument is not a function');
  }
  this._deferredState = 0;
  this._state = 0;
  this._value = null;
  this._deferreds = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
PromiseNs._onHandle = null;
PromiseNs._onReject = null;
PromiseNs._noop = noop;

PromiseNs.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== PromiseNs) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new PromiseNs(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new PromiseNs(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
}
function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (PromiseNs._onHandle) {
    PromiseNs._onHandle(self);
  }
  if (self._state === 0) {
    if (self._deferredState === 0) {
      self._deferredState = 1;
      self._deferreds = deferred;
      return;
    }
    if (self._deferredState === 1) {
      self._deferredState = 2;
      self._deferreds = [self._deferreds, deferred];
      return;
    }
    self._deferreds.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  setTimeout(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._state === 1) {
        resolve(deferred.PromiseNs, self._value);
      } else {
        reject(deferred.PromiseNs, self._value);
      }
      return;
    }
    var ret = tryCallOne(cb, self._value);
    if (ret === IS_ERROR) {
      reject(deferred.PromiseNs, LAST_ERROR);
    } else {
      resolve(deferred.PromiseNs, ret);
    }
  }, 10);
}
function resolve(self, newValue) {
  // PromiseNs Resolution Procedure: https://github.com/PromiseNss-aplus/PromiseNss-spec#the-PromiseNs-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A PromiseNs cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof PromiseNs
    ) {
      self._state = 3;
      self._value = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._state = 1;
  self._value = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  if (PromiseNs._onReject) {
    PromiseNs._onReject(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._deferredState === 1) {
    handle(self, self._deferreds);
    self._deferreds = null;
  }
  if (self._deferredState === 2) {
    for (var i = 0; i < self._deferreds.length; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }
}

function Handler(onFulfilled, onRejected, PromiseNs){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.PromiseNs = PromiseNs;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, PromiseNs) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(PromiseNs, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(PromiseNs, reason);
  });
  if (!done && res === IS_ERROR) {
    done = true;
    reject(PromiseNs, LAST_ERROR);
  }
}

PromiseNs.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this;
  self.then(null, function (err) {
    setTimeout(function () {
      throw err;
    }, 0);
  });
};

/* Static Functions */

var TRUE = valuePromiseNs(true);
var FALSE = valuePromiseNs(false);
var NULL = valuePromiseNs(null);
var UNDEFINED = valuePromiseNs(undefined);
var ZERO = valuePromiseNs(0);
var EMPTYSTRING = valuePromiseNs('');

function valuePromiseNs(value) {
  var p = new PromiseNs(PromiseNs._noop);
  p._state = 1;
  p._value = value;
  return p;
}
PromiseNs.resolve = function (value) {
  if (value instanceof PromiseNs) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new PromiseNs(then.bind(value));
      }
    } catch (ex) {
      return new PromiseNs(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromiseNs(value);
};

PromiseNs.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new PromiseNs(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof PromiseNs && val.then === PromiseNs.prototype.then) {
          while (val._state === 3) {
            val = val._value;
          }
          if (val._state === 1) return res(i, val._value);
          if (val._state === 2) reject(val._value);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new PromiseNs(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

PromiseNs.reject = function (value) {
  return new PromiseNs(function (resolve, reject) {
    reject(value);
  });
};

PromiseNs.race = function (values) {
  return new PromiseNs(function (resolve, reject) {
    values.forEach(function(value){
      PromiseNs.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

PromiseNs.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

PromiseNs.prototype.finally = function (f) {
  return this.then(function (value) {
    return PromiseNs.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return PromiseNs.resolve(f()).then(function () {
      throw err;
    });
  });
};
var PromiseNs = PromiseNs

