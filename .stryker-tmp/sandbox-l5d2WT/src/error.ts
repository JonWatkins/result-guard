/**
 * Safely converts any thrown value into an error object.
 * This ensures consistent error typing even when non-Error values are thrown.
 *
 * @param error The value that was thrown
 * @returns A proper Error object
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export function toError(error: unknown): Error {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    if (stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2"), error instanceof Error)) {
      if (stryMutAct_9fa48("3")) {
        {}
      } else {
        stryCov_9fa48("3");
        return error;
      }
    }
    if (stryMutAct_9fa48("6") ? typeof error !== 'string' : stryMutAct_9fa48("5") ? false : stryMutAct_9fa48("4") ? true : (stryCov_9fa48("4", "5", "6"), typeof error === (stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), 'string')))) {
      if (stryMutAct_9fa48("8")) {
        {}
      } else {
        stryCov_9fa48("8");
        return new Error(error);
      }
    }
    return new Error(stryMutAct_9fa48("9") ? `` : (stryCov_9fa48("9"), `Non-error value thrown: ${formatErrorValue(error)}`));
  }
}

/**
 * Formats an unknown error value into a readable string
 *
 * @param error The value to format
 * @returns A string representation of the error
 */
function formatErrorValue(error: unknown): string {
  if (stryMutAct_9fa48("10")) {
    {}
  } else {
    stryCov_9fa48("10");
    if (stryMutAct_9fa48("13") ? error !== null : stryMutAct_9fa48("12") ? false : stryMutAct_9fa48("11") ? true : (stryCov_9fa48("11", "12", "13"), error === null)) return stryMutAct_9fa48("14") ? "" : (stryCov_9fa48("14"), 'null');
    if (stryMutAct_9fa48("17") ? error !== undefined : stryMutAct_9fa48("16") ? false : stryMutAct_9fa48("15") ? true : (stryCov_9fa48("15", "16", "17"), error === undefined)) return stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), 'undefined');
    try {
      if (stryMutAct_9fa48("19")) {
        {}
      } else {
        stryCov_9fa48("19");
        return JSON.stringify(error);
      }
    } catch {
      if (stryMutAct_9fa48("20")) {
        {}
      } else {
        stryCov_9fa48("20");
        return String(error);
      }
    }
  }
}

/**
 * Creates a success result
 */
export function createSuccess<T>(data: T) {
  if (stryMutAct_9fa48("21")) {
    {}
  } else {
    stryCov_9fa48("21");
    return stryMutAct_9fa48("22") ? {} : (stryCov_9fa48("22"), {
      data,
      error: null,
      isError: false as const
    });
  }
}

/**
 * Creates a failure result
 */
export function createFailure<E>(error: E) {
  if (stryMutAct_9fa48("23")) {
    {}
  } else {
    stryCov_9fa48("23");
    return stryMutAct_9fa48("24") ? {} : (stryCov_9fa48("24"), {
      data: null,
      error,
      isError: true as const
    });
  }
}

/**
 * Handles an error value, converting it to the appropriate type
 */
export function handleError<E = Error>(error: unknown): E {
  if (stryMutAct_9fa48("25")) {
    {}
  } else {
    stryCov_9fa48("25");
    return (error instanceof Error ? error : toError(error)) as E;
  }
}