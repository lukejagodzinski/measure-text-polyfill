(function() {
  var isNative = function () {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var metrics = ctx.measureText(' ');
    var count = 0;
    for (var i in metrics) count++;
    return count > 1;
  };

  // Check wheater ther is native support for extended TextMetrics.
  if (isNative()) return;

  // Store the old text metrics function on the Canvas2D prototype.
  CanvasRenderingContext2D.prototype.measureTextWidth = CanvasRenderingContext2D.prototype.measureText;

  /**
   * The new text metric object constructor
   */
  TextMetrics = function(ctx, text) {
    this._ctx = ctx;
    this._text = text;
    this._isSpace = !(/\S/.test(text));
    this._metrics = {};
  };

  var prepareMetrics = function() {
    if (this._metricsPrepared) return;

    // If we're not dealing with white space, we can compute metrics.
    var font = this._ctx.font.split('px ');
    var fontSize = font[0];
    var fontFamily = font[1].replace(/"|'/g, '');

    // Have characters, so measure the text.
    var canvas = document.createElement('canvas');
    this._padding = 100;
    canvas.width = this.width + this._padding;
    canvas.height = 3 * fontSize;
    var ctx = canvas.getContext('2d');
    ctx.font = fontSize + 'px ' + fontFamily;

    this._width = canvas.width;
    this._height = canvas.height;
    this._baseline = this._height / 2;

    // Set all canvas pixeldata values to 255, with all the content
    // data being 0. This lets us scan for data[i] != 255.
    ctx.fillStyle = 'white';
    ctx.fillRect(-1, -1, this._width + 2, this._height + 2);
    ctx.fillStyle = 'black';
    ctx.fillText(this._text, this._padding / 2, this._baseline);
    this._pixelData = ctx.getImageData(0, 0, this._width, this._height).data;

    this._metricsPrepared = true;
  };

  TextMetrics.prototype = {};

  Object.defineProperty(TextMetrics.prototype, 'width', {
    get: function() {
      if (!this._metrics.hasOwnProperty('width')) {
        this._metrics.width = this._ctx.measureTextWidth(this._text).width;
      }

      return this._metrics.width;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxLeft', {
    get: function() {
      if (!this._metrics.hasOwnProperty('actualBoundingBoxLeft')) {
        if (this._isSpace) {
          this._metrics.actualBoundingBoxLeft = 0;
        } else {
          prepareMetrics.call(this);

          var i = 0;
          var w4 = this._width * 4;
          var l = this._pixelData.length;

          // Find the min-x coordinate.
          for (var i = 0; i < l && this._pixelData[i] === 255;) {
            i += w4;
            if (i >= l) {
              i = (i - l) + 4;
            }
          }
          var minx = ((i % w4) / 4) | 0;

          this._metrics.actualBoundingBoxLeft = minx - (this._padding / 2);
        }
      }

      return this._metrics.actualBoundingBoxLeft;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxRight', {
    get: function() {
      if (!this._metrics.hasOwnProperty('actualBoundingBoxRight')) {
        if (this._isSpace) {
          this._metrics.actualBoundingBoxRight = this.width;
        } else {
          prepareMetrics.call(this);

          var i = 0;
          var w4 = this._width * 4;
          var l = this._pixelData.length;
          var step = 1;

          // Find the max-x coordinate.
          for (i = l - 3; i >= 0 && this._pixelData[i] === 255;) {
            i -= w4;
            if (i < 0) {
              i = (l - 3) - (step++) * 4;
            }
          }
          var maxx = ((i % w4) / 4) + 1 | 0;

          this._metrics.actualBoundingBoxRight = maxx - (this._padding / 2);
        }
      }

      return this._metrics.actualBoundingBoxRight;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'fontBoundingBoxAscent', {
    get: function() {
      throw new Error('Property not supported yet');
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'fontBoundingBoxDescent', {
    get: function() {
      throw new Error('Property not supported yet');
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxAscent', {
    get: function() {
      if (!this._metrics.hasOwnProperty('actualBoundingBoxAscent')) {
        if (this._isSpace) {
          this._metrics.actualBoundingBoxAscent = 0;
        } else {
          prepareMetrics.call(this);

          var i = 0;
          var w4 = this._width * 4;
          var l = this._pixelData.length;

          // Finding the ascent uses a normal, forward scanline.
          while (++i < l && this._pixelData[i] === 255) {}
          var ascent = (i / w4) | 0;

          this._metrics.actualBoundingBoxAscent = this._baseline - ascent;
        }
      }

      return this._metrics.actualBoundingBoxAscent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxDescent', {
    get: function() {
      if (!this._metrics.hasOwnProperty('actualBoundingBoxDescent')) {
        if (this._isSpace) {
          this._metrics.actualBoundingBoxDescent = 0;
        } else {
          prepareMetrics.call(this);

          var w4 = this._width * 4;
          var l = this._pixelData.length;
          var i = l - 1;

          // Finding the descent uses a reverse scanline.
          while (--i > 0 && this._pixelData[i] === 255) {}
          var descent = (i / w4) | 0;

          this._metrics.actualBoundingBoxDescent = descent - this._baseline;
        }
      }

      return this._metrics.actualBoundingBoxDescent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'emHeightAscent', {
    get: function() {
      if (!this._metrics.hasOwnProperty('emHeightAscent')) {
        this._metrics.emHeightAscent = 'top';
      }
      return this._metrics.emHeightAscent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'emHeightDescent', {
    get: function() {
      if (!this._metrics.hasOwnProperty('emHeightDescent')) {
        this._metrics.emHeightDescent = 'bottom';
      }
      return this._metrics.emHeightDescent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'hangingBaseline', {
    get: function() {
      if (!this._metrics.hasOwnProperty('hangingBaseline')) {
        this._metrics.hangingBaseline = 'hanging';
      }
      return this._metrics.hangingBaseline;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'alphabeticBaseline', {
    get: function() {
      if (!this._metrics.hasOwnProperty('alphabeticBaseline')) {
        this._metrics.alphabeticBaseline = 'alphabetic';
      }
      return this._metrics.alphabeticBaseline;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'ideographicBaseline', {
    get: function() {
      if (!this._metrics.hasOwnProperty('ideographicBaseline')) {
        this._metrics.ideographicBaseline = 'ideographic';
      }
      return this._metrics.ideographicBaseline;
    }
  });

  CanvasRenderingContext2D.prototype.measureText = function(text) {
    return new TextMetrics(ctx, text);
  };
}());
