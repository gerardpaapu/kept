import { TPicker, TValueInterpreter } from "../../query/algebra";

const getSqlValue =
  (start: number): TValueInterpreter<string> =>
  (scr) => {
    let id = start;
    return scr(
      {
        get: (obj) => `${obj}->$${id++}`,
        val: () => `$${id++}`,
        id: () => "objects.id",
      },
      "json"
    );
  };

const getParamsValue: TValueInterpreter<(string | number)[]> = (scr) =>
  scr(
    {
      get: (obj, value) => [`${value}`],
      val: (s) => [s],
      id: () => [],
    },
    [] as (number | string)[]
  );

const compileValue = (src: TPicker, start: number) => ({
  sql: getSqlValue(start)(src),
  params: getParamsValue(src),
});

export default compileValue;
