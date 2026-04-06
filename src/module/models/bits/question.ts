import fields = foundry.data.fields;

const defineBondQuestionFieldSchema = () => {
  return {
    question: new fields.StringField({ nullable: false }),
    options: new fields.ArrayField(new fields.StringField({ nullable: false })),
  };
};

type BondQuestionFieldSchema = ReturnType<typeof defineBondQuestionFieldSchema>;

export type BondQuestionData = fields.SchemaField.InitializedData<BondQuestionFieldSchema>;

export class BondQuestionField<
  Options extends fields.SchemaField.Options<BondQuestionFieldSchema> = fields.SchemaField.DefaultOptions,
> extends fields.SchemaField<BondQuestionFieldSchema, Options> {
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
