const bans = [
  ["AwaitExpression > ImportExpression", "Use a static import instead of await import()."],
  ["CallExpression > MemberExpression.callee[property.name='then']", "Use async/await instead of .then(). For fire-and-forget, wrap in `void (async () => { ... })()`."],
  ["TryStatement[finalizer]", "Avoid try/finally. Put cleanup after the try/catch block — it runs in both paths anyway."],
  ["TSTypeReference > Identifier[name='Omit']", "Don't use Omit<>. Define an explicit base type that other types extend."],
  ["TSInterfaceHeritage > Identifier[name='Omit']", "Don't use Omit<> in extends. Define an explicit base type that other types extend."],
  ["JSXExpressionContainer CallExpression[callee.type='ArrowFunctionExpression']", "Don't inline an IIFE in JSX. Extract the logic into a named component or compute the value above the return statement."],
  ["CallExpression[callee.object.name='window'][callee.property.name=/^(confirm|alert|prompt)$/]", "Don't use window.confirm/alert/prompt. Use a styled in-app dialog."],
  ["CallExpression[callee.name=/^(confirm|alert|prompt)$/]", "Don't use the bare confirm/alert/prompt globals. Use a styled in-app dialog."],
];
export default {
  meta: { name: "restricted" },
  rules: {
    syntax: {
      meta: { type: "problem", docs: { description: "Ban syntax patterns" } },
      create(context) {
        return Object.fromEntries(bans.map(([selector, message]) => [selector, (node) => context.report({ node, message })]));
      },
    },
  },
};
