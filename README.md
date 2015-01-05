# Polyfill for measureText() function

This polyfill is based on two projects from [@Pomax](https://github.com/Pomax/fontmetrics.js) and [@motiz88](https://github.com/motiz88/canvas-text-metrics-polyfill) but this one is designed to be compatible with the [standard](https://html.spec.whatwg.org/#drawing-text-to-the-bitmap).

## TODO

- ~~Take `textAlign` property into account in calculations~~ (DONE)
- Support for `fontBoundingBoxAscent` and `fontBoundingBoxDescent` properties
