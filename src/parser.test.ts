import { Lexer } from "./lexer";
import { FunctionStatement, Parser } from "./parser";

describe("parser constructs AST based on tokens", () => {
  it("should parse AST for simple arithmetic expression assignment", () => {
    const sourceCode = "let hello = 2;";
    const expectedAST = {
      type: "LetStatement",
      identifier: "hello",
      expression: { literal: 2, type: "NumberExpression" },
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for simple arithmetic expression assignment when spaces and newlines are present", () => {
    const sourceCode = `let
    spacedAssignment =          244444;`;
    const expectedAST = {
      type: "LetStatement",
      identifier: "spacedAssignment",
      expression: { literal: 244444, type: "NumberExpression" },
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for more complex binary expression involving addition", () => {
    const sourceCode = "let hello = 2 + 5;";

    const expectedAST = {
      type: "LetStatement",
      identifier: "hello",
      expression: {
        type: "BinaryExpression",
        leftOperand: {
          type: "NumberExpression",
          literal: 2,
        },
        rightOperand: {
          type: "NumberExpression",
          literal: 5,
        },
        operator: {
          value: "+",
          type: "ADD",
        },
      },
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for more complex binary expression subtraction", () => {
    const sourceCode = "let hello = 2 - 5;";

    const expectedAST = {
      type: "LetStatement",
      identifier: "hello",
      expression: {
        type: "BinaryExpression",
        leftOperand: {
          type: "NumberExpression",
          literal: 2,
        },
        rightOperand: {
          type: "NumberExpression",
          literal: 5,
        },
        operator: {
          value: "-",
          type: "MINUS",
        },
      },
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for more complex binary expression division", () => {
    const sourceCode = "let hello = 2 / 5;";

    const expectedAST = {
      type: "LetStatement",
      identifier: "hello",
      expression: {
        type: "BinaryExpression",
        leftOperand: {
          type: "NumberExpression",
          literal: 2,
        },
        rightOperand: {
          type: "NumberExpression",
          literal: 5,
        },
        operator: {
          value: "/",
          type: "DIVISION",
        },
      },
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for a basic function declaration with no body", () => {
    const sourceCode = `fn customFunc() {
    }`;

    const expectedAST = {
      type: "FunctionStatement",
      identifier: "customFunc",
    };

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);
    expect(programNode.body[0]).toMatchObject(expectedAST);
  });

  it("should parse AST for a basic function declaration with simple body", () => {
    const sourceCode = `fn customFunc() {
      let helloBody = 5 + 5;
    }`;

    const expectedAST = [
      {
        type: "LetStatement",
        identifier: "helloBody",
        expression: {
          type: "BinaryExpression",
          leftOperand: {
            type: "NumberExpression",
            literal: 5,
          },
          rightOperand: {
            type: "NumberExpression",
            literal: 5,
          },
          operator: {
            value: "+",
            type: "ADD",
          },
        },
      },
      {
        type: "LetStatement",
        identifier: "anotherThing",
        expression: {
          type: "BinaryExpression",
          leftOperand: {
            type: "BinaryExpression",
            leftOperand: {
              type: "NumberExpression",
              literal: 5,
            },
            rightOperand: {
              type: "NumberExpression",
              literal: 4,
            },
            operator: {
              value: "*",
              type: "MULTIPLICATION",
            },
          },
          rightOperand: {
            type: "BinaryExpression",
            leftOperand: {
              type: "NumberExpression",
              literal: 3,
            },
            rightOperand: {
              type: "NumberExpression",
              literal: 9,
            },
            operator: {
              value: "/",
              type: "DIVISION",
            },
          },
          operator: {
            value: "-",
            type: "MINUS",
          },
        },
      },
    ];

    const lexer = new Lexer(sourceCode);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const programNode = parser.parse();
    expect(programNode.body).toHaveLength(1);

    // TODO: This test needs to include an evaluation against the AST, but currently, the match
    // fails because I'm not evaluating debug functions, which makes this annoying to test.
  });
});
