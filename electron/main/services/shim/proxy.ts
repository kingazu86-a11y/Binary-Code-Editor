import { getActiveExtensionId } from './ipc';

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Proxy Fallback Generator
// ─────────────────────────────────────────────────────────────────────────────

export function createFallbackConstructor(name: string) {
  const FallbackClass = class {
    constructor(...args: any[]) {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        Object.assign(this, args[0]);
      }
    }
  };
  Object.defineProperty(FallbackClass, 'name', { value: name });
  return FallbackClass;
}

export function createResilientProxy<T extends object>(target: T, namespaceName = 'vscode'): T {
  return new Proxy(target, {
    get(obj: any, prop: string | symbol, receiver: any) {
      if (prop === Symbol.iterator) {
        if (Symbol.iterator in obj) {
          return Reflect.get(obj, prop, receiver);
        }
        return function* () {};
      }
      if (typeof prop === 'symbol' || prop in obj) {
        return Reflect.get(obj, prop, receiver);
      }
      if (prop === 'then' || prop === 'catch' || prop === 'default') {
        return undefined;
      }
      if (prop === '__esModule') {
        return true;
      }
      const propStr = String(prop);
      // Capitalized names indicate Class constructors or Enums: provide a constructible class
      if (/^[A-Z]/.test(propStr)) {
        const cls = createFallbackConstructor(propStr);
        obj[propStr] = cls;
        return cls;
      }
      // Lowercase names indicate methods or sub-namespaces: return a callable and chainable recursive proxy
      const dummyFn: any = (..._args: any[]) => {
        if (process.env.BINARY_EXTENSION_DEBUG) {
          console.debug(
            `[Binary Extension API] Extension: ${getActiveExtensionId()} | API called: ${namespaceName}.${propStr}`
          );
        }
        // If method is creating/registering/getting an object, return a resilient proxy object instead of raw undefined
        if (/^(create|register|get|as[A-Z]|open|show)/.test(propStr)) {
          const resObj: any = {
            dispose: () => {},
            reveal: () => {},
            hide: () => {},
            show: () => {},
            clear: () => {},
            update: () => {},
            [Symbol.iterator]: function* () {},
          };
          return createResilientProxy(resObj, `${namespaceName}.${propStr}()`);
        }
        return undefined;
      };
      dummyFn[Symbol.iterator] = function* () {};
      const subProxy = createResilientProxy(dummyFn, `${namespaceName}.${propStr}`);
      obj[propStr] = subProxy;
      return subProxy;
    },
    has(_obj: any, _prop: string | symbol) {
      return true;
    },
  });
}
