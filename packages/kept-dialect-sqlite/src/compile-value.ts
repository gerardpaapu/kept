import { TPicker, TValueInterpreter } from "@donothing/kept-core/dist/algebra";

const getSqlValue: TValueInterpreter<string> = (scr) =>
	scr(
		{
			get: (obj) => `json_extract(${obj}, ?)`,
			val: () => "?",
			id: () => "objects.id",
		},
		"json0",
	);

const getParamsValue: TValueInterpreter<(string | number)[]> = (scr) =>
	scr(
		{
			get: (obj, value) => [`$.${value}`],
			val: (s) => [s],
			id: () => [],
		},
		[] as (number | string)[],
	);

const compileValue = (src: TPicker) => ({
	sql: getSqlValue(src),
	params: getParamsValue(src),
});

export default compileValue;
