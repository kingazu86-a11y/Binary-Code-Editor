export const l10n = {
  t: (message: string | { message: string; args?: any[] }, ...args: any[]): string => {
    if (typeof message === 'string') {
      let res = message;
      args.forEach((arg, i) => {
        res = res.replace(`{${i}}`, String(arg));
      });
      return res;
    }
    if (message && typeof message.message === 'string') {
      let res = message.message;
      const a = message.args || args;
      a.forEach((arg: any, i: number) => {
        res = res.replace(`{${i}}`, String(arg));
      });
      return res;
    }
    return String(message || '');
  },
  bundle: undefined,
  uri: undefined,
};
