import { TPicker, TValueInterpreter } from "../../query/algebra";
interface IPGValue {
  asUnknown(): string;
  asJson(): string;
}

const getSqlValue =
  (start: number): TValueInterpreter<IPGValue> =>
  (scr) => {
    let id = start;
    return scr<IPGValue>(
      {
        get: (obj) => {
          const n = id++;
          return {
            asJson: () => `${obj.asJson()}->$${n}`,
            asUnknown: () => `${obj.asJson()}->>$${n}`,
          };
        },

        val: () => {
          const n = id++;
          return {
            asJson: () => `$${n}`,
            asUnknown: () => `$${n}`,
          };
        },
        id: () => ({
          asJson: (): string => {
            throw new Error();
          },
          asUnknown: () => "objects.id",
        }),
      },
      {
        asJson: () => "json",
        asUnknown: () => {
          throw new Error();
        },
      }
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
  sql: getSqlValue(start)(src).asUnknown(),
  params: getParamsValue(src),
});

export default compileValue;
