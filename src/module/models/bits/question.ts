import fields = foundry.data.fields;

export interface BondQuestionData {
  question: string;
  options: Array<string>;
}

const defineBondQuestionFieldSchema = () => {
  return {
    question: new fields.StringField({ nullable: false }),
    options: new fields.ArrayField(new fields.StringField({ nullable: false })),
  };
};

type BondQuestionFieldSchema = ReturnType<typeof defineBondQuestionFieldSchema>;

export class BondQuestionField<Options extends fields.SchemaField<BondQuestionFieldSchema>> extends fields.SchemaField<
  BondQuestionFieldSchema,
  Options
> {
  constructor(options?: Options) {
    super(defineBondQuestionFieldSchema(), options);
  }
}

export function unpackQuestion(data: any): BondQuestionData {
  return {
    question: data.question,
    options: data.options,
  };
}
