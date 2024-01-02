import { pipe, map, filter, count, collectSet, zip, range } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";
import { getKeywordName, Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/contains";

const compile = async (schema, ast, parentSchema) => {
  const contains = await Validation.compile(schema, ast);

  const minContainsKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/minContains");
  const minContainsSchema = await Browser.step(minContainsKeyword, parentSchema);
  const minContains = Browser.typeOf(minContainsSchema) === "number" ? Browser.value(minContainsSchema) : 1;

  const maxContainsKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/maxContains");
  const maxContainsSchema = await Browser.step(maxContainsKeyword, parentSchema);
  const maxContains = Browser.typeOf(maxContainsSchema) === "number" ? Browser.value(maxContainsSchema) : Number.MAX_SAFE_INTEGER;

  return { contains, minContains, maxContains };
};

const interpret = ({ contains, minContains, maxContains }, instance, ast, dynamicAnchors, quiet) => {
  let iterator;
  if (Instance.typeOf(instance) === "array") {
    iterator = Instance.iter(instance);
  } else if (Instance.typeOf(instance) === "object") {
    iterator = Instance.values(instance);
  } else {
    return true;
  }

  const matches = pipe(
    iterator,
    filter((item) => Validation.interpret(contains, item, ast, dynamicAnchors, quiet)),
    count
  );
  return matches >= minContains && matches <= maxContains;
};

const collectEvaluatedProperties = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors, true)
    && Instance.typeOf(instance) === "object"
    && pipe(
      Instance.entries(instance),
      filter(([, item]) => Validation.interpret(keywordValue.contains, item, ast, dynamicAnchors, true)),
      map(([propertyName]) => propertyName),
      collectSet
    );
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors, true)
    && Instance.typeOf(instance) === "array"
    && pipe(
      zip(Instance.iter(instance), range(0)),
      filter(([item]) => Validation.interpret(keywordValue.contains, item, ast, dynamicAnchors, true)),
      map(([, itemIndex]) => itemIndex),
      collectSet
    );
};

export default { id, compile, interpret, collectEvaluatedItems, collectEvaluatedProperties };
