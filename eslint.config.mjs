import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

function asArray(config) {
  return Array.isArray(config) ? config : [config];
}

const eslintConfig = [
  ...asArray(nextCoreWebVitals),
  ...asArray(nextTypescript),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML is prohibited.",
        },
      ],
    },
  },
];

export default eslintConfig;
