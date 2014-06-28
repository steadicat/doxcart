package markdown

import (
  "github.com/russross/blackfriday"
)

func markdown(input []byte) []byte {
  // set up the HTML renderer
  htmlFlags := 0
  htmlFlags |= blackfriday.HTML_USE_XHTML
  htmlFlags |= blackfriday.HTML_USE_SMARTYPANTS
  htmlFlags |= blackfriday.HTML_SMARTYPANTS_FRACTIONS
  htmlFlags |= blackfriday.HTML_SMARTYPANTS_LATEX_DASHES
  htmlFlags |= blackfriday.HTML_SANITIZE_OUTPUT
  renderer := blackfriday.HtmlRenderer(htmlFlags, "", "")

  // set up the parser
  extensions := 0
  extensions |= blackfriday.EXTENSION_NO_INTRA_EMPHASIS
  extensions |= blackfriday.EXTENSION_TABLES
  extensions |= blackfriday.EXTENSION_FENCED_CODE
  extensions |= blackfriday.EXTENSION_AUTOLINK
  extensions |= blackfriday.EXTENSION_STRIKETHROUGH
  extensions |= blackfriday.EXTENSION_LAX_HTML_BLOCKS
  extensions |= blackfriday.EXTENSION_SPACE_HEADERS
  extensions |= blackfriday.EXTENSION_HARD_LINE_BREAK
  extensions |= blackfriday.EXTENSION_FOOTNOTES
  extensions |= blackfriday.EXTENSION_NO_EMPTY_LINE_BEFORE_BLOCK
  extensions |= blackfriday.EXTENSION_HEADER_IDS

  return blackfriday.Markdown(input, renderer, extensions)
}

func Markdown(input string) string {
  return string(markdown([]byte(input)))
}