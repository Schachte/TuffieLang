/**
 * Token is the smallest unit of valid syntax in our language.
 * We might have something like "**" which would have a value of "**"
 * as the literal and the type would be "Exp" to represent exponent.
 */
export interface Token {
  value?: string;
  type: TokenType;
  error?(): Error | undefined;
}

type ParseFunc = (input: string[]) => Token | Error;
interface TokenizeHandler {
  error?(): Error;
  // parse handles generating the token and increment the current lexer position.
  // If parse is called, it's assumed that the input being passed in is valid for that
  // parse function, otherwise an error is thrown.
  parse?: ParseFunc | Error;
  // satisfies will evaluate if the current token should be ran through a parse function.
  satisfies: (input: string[]) => ParseFunc | undefined;
}

export enum TokenType {
  EOF = "EOF",
  Symbol = "SYMBOL",
  Eq = "EQUAL",
  Deq = "DOUBLE_EQUAL",
  Teq = "TRIPLE_EQUAL",
  Number = "NUMBER",
  Add = "ADD",
  Minus = "MINUS",
  DMinus = "DOUBLE_MINUS",
  Div = "DIVISION",
  Mult = "MULTIPLICATION",
  Exp = "EXPONENT",
  Const = "CONST",
  Let = "LET",
  Underscore = "UNDERSCORE",
  Semicolon = "SEMICOLON",
  DblQuote = "DOUBLE_QUOTE",
  SnglQuote = "SINGLE_QUOTE",
  String = "STRING",
  Function = "FUNCTION",
  LeftParen = "L_PAREN",
  RightParen = "R_PAREN",
  LeftBrace = "L_BRACE",
  RightBrace = "R_BRACE",
}

const TokenTypeReverseLookup: Record<string, TokenType> = {
  "=": TokenType.Eq,
  '"': TokenType.DblQuote,
  "'": TokenType.SnglQuote,
  "==": TokenType.Deq,
  "+": TokenType.Add,
  "-": TokenType.Minus,
  "--": TokenType.DMinus,
  "/": TokenType.Div,
  "*": TokenType.Mult,
  "^": TokenType.Exp,
  ";": TokenType.Semicolon,
  "(": TokenType.LeftParen,
  ")": TokenType.RightParen,
  "{": TokenType.LeftBrace,
  "}": TokenType.RightBrace,
  fn: TokenType.Function,
  _: TokenType.Underscore,
  const: TokenType.Const,
  let: TokenType.Let,
};

export class Lexer {
  private input: string[];
  private tokens: Array<Token>;
  private lexemeHandlers: TokenizeHandler[];
  constructor(input: string) {
    this.input = input.split("");
    this.tokens = new Array<Token>();
    this.lexemeHandlers = [
      QuoteHandler,
      SpaceHandler,
      EqualHandler,
      MinusHandler,
      NumberHandler,
      LetHandler,
      ConstHandler,
      FunctionHandler,
    ];
  }

  /**
   * tokenize will begin outputting a list of tokens for the input source
   * file.
   * @param source is the input source file
   */
  tokenize(): Array<Token> {
    // We need to continuously iterate through the input and try to
    // create a token for each character or group of characters we see.
    while (this.input.length > 0) {
      const currChar = this.input[0];
      if (!currChar) break;

      const tokenParser = this.evalToken();
      if (!tokenParser) {
        throw new Error(
          `No valid parser function for the token: ${this.input[0]}`
        );
      }

      // If the lexer thinks there might be a match on the character sequence
      // then we attempt to generate the associated token. If no token is created,
      // then we continue parsing
      const tokenOrErr = tokenParser(this.input);
      if (tokenOrErr instanceof Error) {
        throw tokenOrErr;
      }
      if (tokenOrErr) this.tokens.push(tokenOrErr);
    }

    this.tokens.push(Lexer.generateToken(undefined, TokenType.EOF));
    return this.tokens;
  }

  /**
   * EvalToken will evaluate single and multi-digit character sequences
   * to determine if and when they should be parsed with the goal of creating
   * a valid token. These tokens will later be used for AST construction when parsing.
   * The result here is the function that will be used to parse if there is a match.
   *
   * @param input character array of input from the source file
   * @returns function for generating a token from the given input
   */
  private evalToken = (): ParseFunc => {
    let lexeme;
    // Handle single byte lexemes first as they're easiest to parse
    switch (this.input[0]) {
      case ";":
      case "*":
      case "+":
      case "/":
      case "_":
      case "(":
      case ")":
      case "{":
      case "}":
        lexeme = this.input.shift();
        return (_: string[]) =>
          Lexer.generateToken(lexeme, TokenTypeReverseLookup[lexeme]);
    }

    // SymbolHandler must always be evaluated last as to not conflict with reserved
    // keywords. As such, we can force it to be last to avoid any future mistakes.
    for (let handler of [...this.lexemeHandlers, SymbolHandler]) {
      // If the current token(s) match some expression, we grab the parse
      // function for it.
      const parseFn = handler.satisfies(this.input);
      if (!parseFn) continue;
      return parseFn;
    }
    throw new Error(`unable to lex token from ${this.input[0]}`);
  };

  static generateToken(value: string | undefined, type: TokenType): Token {
    if (!value) {
      return { type };
    }
    return {
      value,
      type,
    };
  }

  static getCharAndRemove(input: string[]): string {
    const result = input.shift();
    if (result === undefined) {
      throw new Error("unable to retrieve invalid character");
    }
    return result;
  }

  static charIsAny(input: any, ...options: any[]): boolean {
    for (let option of options) {
      if (input === option) return true;
    }
    return false;
  }
}

// Some useful utility functions for lexical analysis
const isAlpha = (char: string): boolean => /[a-zA-Z]/.test(char);
const isFunction = (char: string): boolean => /fn/.test(char);
const isDigit = (char: string): boolean => /\d/.test(char);
const isWhitespace = (char: string): boolean => /\s/.test(char);
const isUnderscore = (char: string): boolean => char === "_";
const isSymbol = (char: string): boolean => isAlpha(char) || isUnderscore(char);
const matchBetweenQuotes = (str: string): string | null => {
  const regex = /\"(.*?)\"|'(.*?)'/;
  const match = str.match(regex);
  return match ? match[1] || match[2] : null;
};

const SpaceHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    if (input.length > 0 && isWhitespace(input[0])) {
      return this.parse;
    }
    return undefined;
  },
  parse(input: string[]): undefined {
    while (SpaceHandler.satisfies(input)) {
      input.shift();
    }
  },
};

const QuoteHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return input[0] == '"' || input[0] == "'" ? this.parse : undefined;
  },
  parse(input: string[]): Token | Error {
    const quote = Lexer.getCharAndRemove(input);
    let identifierValue = "";
    while (input.length > 0 && input[0] != quote) {
      identifierValue += input.shift();
    }
    const endQuote =
      input.length > 0 ? Lexer.getCharAndRemove(input) : undefined;
    if (endQuote !== quote) {
      return new Error(
        `missing matching end quote of type: "${quote}", but got "${
          identifierValue[identifierValue.length - 1]
        }" Maybe you forgot to close the value: "${identifierValue.substring(
          0,
          identifierValue.length - 1
        )}"`
      );
    }

    return Lexer.generateToken(identifierValue, TokenType.String);
  },
};

const EqualHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return input[0] === "=" ? this.parse : undefined;
  },

  parse(input: string[]): Token | undefined {
    let lexeme = "";
    const equalCount = input.slice(0, 3).filter((char) => char === "=").length;

    if (equalCount > 0 && equalCount <= 3) {
      lexeme = input.splice(0, equalCount).join("");
    }

    let tokenType: TokenType | undefined;
    switch (lexeme) {
      case "=":
        tokenType = TokenType.Eq;
        break;
      case "==":
        tokenType = TokenType.Deq;
        break;
      case "===":
        tokenType = TokenType.Teq;
        break;
      default:
        tokenType = undefined;
    }
    return tokenType ? Lexer.generateToken(lexeme, tokenType) : undefined;
  },
};

const LetHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    if (input.length < "let".length) return undefined;
    const regex = /^(let)\s.*/;

    // evaluate if something starting with "let" is the reserved keyword
    // versus a symbol
    const match = input.slice(0, 4).join("").match(regex);
    return match && match[1].length === "let".length
      ? this.parse.bind(this)
      : undefined;
  },
  parse(input: string[]): Token {
    return Lexer.generateToken(input.splice(0, 3).join(""), TokenType.Let);
  },
};

const NumberHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return isDigit(input[0]) ? this.parse.bind(this) : undefined;
  },

  parse(input: string[]): Token {
    const digits: string[] = [];
    while (input.length > 0 && isDigit(input[0])) {
      digits.push(Lexer.getCharAndRemove(input));
    }
    return Lexer.generateToken(digits.join(""), TokenType.Number);
  },
};

const SymbolHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return isSymbol(input[0]) ? this.parse.bind(this) : undefined;
  },

  parse(input: string[]): Token {
    const symbolChars: string[] = [Lexer.getCharAndRemove(input)];
    while (input.length > 0 && isSymbol(input[0])) {
      symbolChars.push(Lexer.getCharAndRemove(input));
    }
    return Lexer.generateToken(symbolChars.join(""), TokenType.Symbol);
  },
};

const ConstHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    if (input.length < "const".length) return undefined;
    const regex = /^(const)\s.*/;

    // evaluate if something starting with "let" is the reserved keyword
    // versus a symbol
    const match = input.slice(0, 6).join("").match(regex);
    return match && match[1].length === "const".length
      ? this.parse.bind(this)
      : undefined;
  },

  parse(input: string[]): Token {
    return Lexer.generateToken(
      input.splice(0, "const".length).join(""),
      TokenType.Const
    );
  },
};

const MinusHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return input[0] === "-" ? this.parse : undefined;
  },

  parse(input: string[]): Token | Error {
    let lexeme = "";
    const minusCount = input.slice(0, 2).filter((char) => char === "-").length;

    if (minusCount > 0 && minusCount <= 3) {
      lexeme = input.splice(0, minusCount).join("");
    }

    let tokenType: TokenType | undefined;
    switch (lexeme) {
      case "-":
        tokenType = TokenType.Minus;
        break;
      case "--":
        tokenType = TokenType.DMinus;
        break;
      default:
        return new Error(
          `unexpected token received in when parsing "-" and got: ${lexeme}`
        );
    }
    return Lexer.generateToken(lexeme, tokenType);
  },
};

const FunctionHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return input.length >= 2 && isFunction(input.slice(0, 2).join(""))
      ? this.parse
      : undefined;
  },

  parse(input: string[]): Token | Error {
    return Lexer.generateToken(
      input.splice(0, "fn".length).join(""),
      TokenType.Function
    );
  },
};
