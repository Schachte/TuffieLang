export enum TokenType {
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
}

const TokenTypeReverseLookup = {
  "=": TokenType.Eq,
  "==": TokenType.Deq,
  "+": TokenType.Add,
  "-": TokenType.Minus,
  "--": TokenType.DMinus,
  "/": TokenType.Div,
  "*": TokenType.Mult,
  "^": TokenType.Exp,
  ";": TokenType.Semicolon,
  _: TokenType.Underscore,
  const: TokenType.Const,
  let: TokenType.Let,
};

/**
 * Token is the smallest unit of valid syntax in our language.
 * We might have something like "**" which would have a value of "**"
 * as the literal and the type would be "Exp" to represent exponent.
 */
export interface Token {
  value: string | undefined;
  type: TokenType;
}

type ParseFunc = (input: string[]) => Token | undefined;
interface TokenizeHandler {
  // parse handles generating the token and increment the current lexer position
  parse?: ParseFunc;
  // satisfies will evaluate if the current token should be ran through a parse function
  satisfies: (input: string[]) => ParseFunc | undefined;
}

function token(value: string | undefined, type: TokenType): Token {
  return {
    value,
    type,
  };
}

function getCharAndRemove(input: string[]): string {
  const result = input.shift();
  if (result === undefined) {
    throw new Error("unable to retrieve invalid character");
  }
  return result;
}

function charIsAny(input: any, ...options: any[]): boolean {
  for (let option of options) {
    if (input === option) return true;
  }
  return false;
}

const isAlpha = (char: string): boolean => /[a-zA-Z]/.test(char);
const isDigit = (char: string): boolean => /\d/.test(char);
const isUnderscore = (char: string): boolean => char === "_";
const isSymbol = (char: string): boolean => isAlpha(char) || isUnderscore(char);
const isConst = (input: string[]): boolean => {
  const potentialConst = input.slice(0, 5).join("");
  return potentialConst === "const";
};

/**
 * tokenize will begin outputting a list of tokens for the input source
 * file.
 * @param source is the input source file
 */
export function tokenize(source: string): Token[] {
  let tokens = Array<Token>();
  const splitSrc = source.split("");

  // We need to continuously iterate through the input and try to
  // create a token for each character or group of characters we see.
  while (splitSrc.length > 0) {
    const currChar = splitSrc[0];
    if (!currChar) break;

    const tokenParser = EvalToken(splitSrc);
    if (!tokenParser) {
      throw new Error(`No valid parser function for the token: ${splitSrc[0]}`);
    }

    // If the lexer thinks there might be a match on the character sequence
    // then we attempt to generate the associated token. If no token is created,
    // then we continue parsing
    const token = tokenParser(splitSrc);
    if (token) tokens.push(token);
  }

  return tokens;
}

const SpaceHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    if (input.length > 0 && charIsAny(input[0], "\r", "\t", "\n", " ")) {
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
    return tokenType ? token(lexeme, tokenType) : undefined;
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
    return token(input.splice(0, 3).join(""), TokenType.Let);
  },
};

const NumberHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return isDigit(input[0]) ? this.parse.bind(this) : undefined;
  },

  parse(input: string[]): Token {
    const digits: string[] = [];
    while (input.length > 0 && isDigit(input[0])) {
      digits.push(getCharAndRemove(input));
    }
    return token(digits.join(""), TokenType.Number);
  },
};

const SymbolHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return isSymbol(input[0]) ? this.parse.bind(this) : undefined;
  },

  parse(input: string[]): Token {
    const symbolChars: string[] = [];
    while (input.length > 0 && isSymbol(input[0])) {
      symbolChars.push(getCharAndRemove(input));
    }
    return token(symbolChars.join(""), TokenType.Symbol);
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
    if (!isConst(input)) {
      throw new Error("Expected 'const' token");
    }
    return token(input.splice(0, "const".length).join(""), TokenType.Const);
  },
};

const MinusHandler: TokenizeHandler = {
  satisfies(input: string[]): ParseFunc | undefined {
    return input[0] === "-" ? this.parse : undefined;
  },

  parse(input: string[]): Token {
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
        return undefined;
    }
    return token(lexeme, tokenType);
  },
};

const lexemeHandlers = [
  SpaceHandler,
  EqualHandler,
  MinusHandler,
  NumberHandler,
  LetHandler,
  ConstHandler,
];

/**
 * EvalToken will evaluate single and multi-digit character sequences
 * to determine if and when they should be parsed with the goal of creating
 * a valid token. These tokens will later be used for AST construction when parsing.
 * The result here is the function that will be used to parse if there is a match.
 *
 * @param input character array of input from the source file
 * @returns function for generating a token from the given input
 */
const EvalToken = (input: string[]): ParseFunc | undefined => {
  let lexeme;
  // Handle single byte lexemes first as they're easiest to parse
  switch (input[0]) {
    case ";":
    // TODO: This might fail for exponents
    case "*":
    case "+":
    case "/":
    case "_":
      lexeme = input.shift();
      return (_: string[]) => token(lexeme, TokenTypeReverseLookup[lexeme]);
  }

  // SymbolHandler must always be evaluated last as to not conflict with reserved
  // keywords. As such, we can force it to be last to avoid any future mistakes.
  for (let handler of [...lexemeHandlers, SymbolHandler]) {
    // If the current token(s) match some expression, we grab the parse
    // function for it.
    const parseFn = handler.satisfies(input);
    if (!parseFn) continue;
    return parseFn;
  }
  return undefined;
};
