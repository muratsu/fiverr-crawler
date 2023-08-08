import type { Arguments, CommandBuilder } from "yargs";

type Options = {
  name: string;
};

export const command: string = "fetch <page>";
export const desc: string = "Fetch <page> and display contents";

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs.positional("page", { type: "string", demandOption: true });
};

export const handler = (argv: Arguments<Options>): void => {
  const { page } = argv;
  console.log(process.env.OPENAI_API_KEY);

  process.stdout.write(`contents of ${page}`);
  process.exit(0);
};
