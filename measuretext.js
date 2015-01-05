(function() {
  var isNative = function() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var metrics = ctx.measureText(' ');
    var count = 0;
    for (var i in metrics) count++;
    return count > 1;
  };

  // Check wheater there is native support for extended TextMetrics.
  if (isNative()) return;

  // Store the old text metrics function on the Canvas2D prototype.
  CanvasRenderingContext2D.prototype.measureTextWidth = CanvasRenderingContext2D.prototype.measureText;

  var CanvasTextMetrics = function(metrics) {
    this.metrics = metrics;
  };

  CanvasTextMetrics.prototype.prepare = function() {
    if (this._prepared) return;

    // Have characters, so measure the text.
    var canvas = document.createElement('canvas');
    this._padding = this.metrics._fontSize / 2;
    canvas.width = this.getWidth() + (this._padding * 2);
    canvas.height = 3 * this.metrics._fontSize;
    var ctx = canvas.getContext('2d');
    ctx.font = this.metrics._fontSize + 'px ' + this.metrics._fontFamily;

    this._canvasWidth = canvas.width;
    this._canvasHeight = canvas.height;

    // Set all canvas pixeldata values to 255, with all the content
    // data being 0. This lets us scan for data[i] != 255.
    ctx.fillStyle = 'white';
    ctx.fillRect(-1, -1, this._canvasWidth + 2, this._canvasHeight + 2);
    this._textPosX;
    this._textPosY = this._canvasHeight / 2;
    switch (this.metrics._textAlign) {
      case 'center':
        this._textPosX = this._canvasWidth / 2;
        break;
      case 'right':
      case 'end':
        this._textPosX = this._canvasWidth - this._padding;
        break;
      case 'left':
      case 'start':
      default:
        this._textPosX = this._padding;
        break;
    }
    ctx.fillStyle = 'black';
    ctx.textAlign = this.metrics._textAlign;
    ctx.fillText(this.metrics._text, this._textPosX, this._textPosY);
    this._pixelData = ctx.getImageData(0, 0, this._canvasWidth, this._canvasHeight).data;

    this._prepared = true;
  };

  CanvasTextMetrics.prototype.getWidth = function() {
    if (!this.metrics._cache.hasOwnProperty('width')) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.font = this.metrics._font;
      this.metrics._cache.width = ctx.measureTextWidth(this.metrics._text).width;
    }

    return this.metrics._cache.width;
  };

  CanvasTextMetrics.prototype.getActualBoundingBoxLeft = function() {
    if (!this.metrics._cache.hasOwnProperty('actualBoundingBoxLeft')) {
      if (this.metrics._isSpace) {
        this.metrics._cache.actualBoundingBoxLeft = 0;
      } else {
        this.prepare();

        var i = 0;
        var w4 = this._canvasWidth * 4;
        var l = this._pixelData.length;

        // Find the min-x coordinate.
        for (var i = 0; i < l && this._pixelData[i] === 255;) {
          i += w4;
          if (i >= l) {
            i = (i - l) + 4;
          }
        }
        var minx = ((i % w4) / 4) | 0;

        this.metrics._cache.actualBoundingBoxLeft = this._textPosX - minx;
      }
    }

    return this.metrics._cache.actualBoundingBoxLeft;
  };

  CanvasTextMetrics.prototype.getActualBoundingBoxRight = function() {
    if (!this.metrics._cache.hasOwnProperty('actualBoundingBoxRight')) {
      if (this.metrics._isSpace) {
        this.metrics._cache.actualBoundingBoxRight = this.width;
      } else {
        this.prepare();

        var i = 0;
        var w4 = this._canvasWidth * 4;
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

        this.metrics._cache.actualBoundingBoxRight = maxx - this._textPosX;
      }
    }

    return this.metrics._cache.actualBoundingBoxRight;
  };

  CanvasTextMetrics.prototype.getActualBoundingBoxAscent = function() {
    if (!this.metrics._cache.hasOwnProperty('actualBoundingBoxAscent')) {
      if (this.metrics._isSpace) {
        this.metrics._cache.actualBoundingBoxAscent = 0;
      } else {
        this.prepare();

        var i = 0;
        var w4 = this._canvasWidth * 4;
        var l = this._pixelData.length;

        // Finding the ascent uses a normal, forward scanline.
        while (++i < l && this._pixelData[i] === 255) {}
        var ascent = (i / w4) | 0;

        this.metrics._cache.actualBoundingBoxAscent = this._textPosY - ascent;
      }
    }

    return this.metrics._cache.actualBoundingBoxAscent;
  };

  CanvasTextMetrics.prototype.getActualBoundingBoxDescent = function() {
    if (!this.metrics._cache.hasOwnProperty('actualBoundingBoxDescent')) {
      if (this.metrics._isSpace) {
        this.metrics._cache.actualBoundingBoxDescent = 0;
      } else {
        this.prepare();

        var w4 = this._canvasWidth * 4;
        var l = this._pixelData.length;
        var i = l - 1;

        // Finding the descent uses a reverse scanline.
        while (--i > 0 && this._pixelData[i] === 255) {}
        var descent = (i / w4) | 0;

        this.metrics._cache.actualBoundingBoxDescent = descent - this._textPosY;
      }
    }

    return this.metrics._cache.actualBoundingBoxDescent;
  };

  var SVGTextMetrics = function(metrics) {
    this.metrics = metrics;
  };

  /**
   * The new text metric object constructor
   */
  var TextMetrics = function(ctx, text) {
    this._text = text;
    this._isSpace = !(/\S/.test(text));

    var font = ctx.font.split('px ');
    this._font = ctx.font;
    this._fontSize = parseInt(font[0], 10);
    this._fontFamily = font[1].replace(/"|'/g, '');
    this._textAlign = ctx.textAlign;

    this._cache = {};

    this._canvasMetrics = new CanvasTextMetrics(this);
    this._svgMetrics = new SVGTextMetrics(this);
  };

  TextMetrics.prototype = {};

  Object.defineProperty(TextMetrics.prototype, 'width', {
    get: function() {
      return this._canvasMetrics.getWidth();
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxLeft', {
    get: function() {
      return this._canvasMetrics.getActualBoundingBoxLeft();
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxRight', {
    get: function() {
      return this._canvasMetrics.getActualBoundingBoxRight();
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
      return this._canvasMetrics.getActualBoundingBoxAscent();
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'actualBoundingBoxDescent', {
    get: function() {
      return this._canvasMetrics.getActualBoundingBoxDescent();
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'emHeightAscent', {
    get: function() {
      if (!this.metrics._cache.hasOwnProperty('emHeightAscent')) {
        this.metrics._cache.emHeightAscent = 'top';
      }
      return this.metrics._cache.emHeightAscent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'emHeightDescent', {
    get: function() {
      if (!this.metrics._cache.hasOwnProperty('emHeightDescent')) {
        this.metrics._cache.emHeightDescent = 'bottom';
      }
      return this.metrics._cache.emHeightDescent;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'hangingBaseline', {
    get: function() {
      if (!this.metrics._cache.hasOwnProperty('hangingBaseline')) {
        this.metrics._cache.hangingBaseline = 'hanging';
      }
      return this.metrics._cache.hangingBaseline;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'alphabeticBaseline', {
    get: function() {
      if (!this.metrics._cache.hasOwnProperty('alphabeticBaseline')) {
        this.metrics._cache.alphabeticBaseline = 'alphabetic';
      }
      return this.metrics._cache.alphabeticBaseline;
    }
  });

  Object.defineProperty(TextMetrics.prototype, 'ideographicBaseline', {
    get: function() {
      if (!this.metrics._cache.hasOwnProperty('ideographicBaseline')) {
        this.metrics._cache.ideographicBaseline = 'ideographic';
      }
      return this.metrics._cache.ideographicBaseline;
    }
  });

  CanvasRenderingContext2D.prototype.measureText = function(text) {
    return new TextMetrics(this, text);
  };
}());
