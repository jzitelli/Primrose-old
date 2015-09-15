/* global Primrose */
Primrose.Text.Grammars.Python = (function () {
  "use strict";

return new Primrose.Text.Grammar( "Python", [
    [ "newlines", /(?:\r\n|\r|\n)/ ],
    [ "comments", /#.*$/ ],
    [ "strings", /"(?:\\"|[^"])*"/ ],
    [ "strings", /'(\\'|[^'])*'/ ],
    [ "strings", /r"(?:[^"])*"/ ],
    [ "strings", /r'(?:[^'])*'/ ],
    [ "strings", /"""(?:[^"""])*"""/ ],
    [ "strings", /'''(?:[^'''])*'''/ ],
    [ "numbers", /-?(?:(?:\b\d*)?\.)?\b\d+\b/ ],
    [ "keywords",
      /\b(?:and|as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|not|or|pass|print|raise|return|try|while|with|yield|self)\b/
    ],
    [ "functions", /(?:def\s+)(\w+)(?:\s*\()/ ],
    [ "members", /(?:(?:\w+\.)+)(\w+)/ ]
  ] );
} )();
