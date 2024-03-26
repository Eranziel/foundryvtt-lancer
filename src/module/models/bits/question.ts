const fields: any = foundry.data.fields;

export interface BondQuestionData {
  question: string;
  options: Array<string>;
}

export class BondQuestionField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        question: new fields.StringField({ nullable: false }),
        options: new fields.ArrayField(new fields.StringField({ nullable: false })),
      },
      options
    );
  }
}

export function unpackQuestion(data: any): BondQuestionData {
  return {
    question: data.question,
    options: data.options,
  };
}
