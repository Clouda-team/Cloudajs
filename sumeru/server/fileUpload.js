//contains File,MultipartParser,OctetStream,IncomingForm
var fs = require('fs');
var util = require('util'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    Stream = require('stream').Stream,
    os = require('os');

//-------FILE BEGIN
var WriteStream = fs.WriteStream;
    
function File(properties) {
  EventEmitter.call(this);

  this.size = 0;
  this.path = null;
  this.name = null;
  this.type = null;
  this.hash = null;
  this.lastModifiedDate = null;

  this._writeStream = null;
  
  for (var key in properties) {
    this[key] = properties[key];
  }

  this.hash = null;
}
// module.exports = File;
util.inherits(File, EventEmitter);

File.prototype.open = function() {
  this._writeStream = new WriteStream(this.path);
};

File.prototype.toJSON = function() {
  return {
    size: this.size,
    path: this.path,
    name: this.name,
    type: this.type,
    mtime: this.lastModifiedDate,
    length: this.length,
    filename: this.filename,
    mime: this.mime
  };
};

File.prototype.write = function(buffer, cb) {
  var self = this;
  this._writeStream.write(buffer, function() {
    self.lastModifiedDate = new Date();
    self.size += buffer.length;
    self.emit('progress', self.size);
    cb();
  });
};

File.prototype.end = function(cb) {
  var self = this;
  this._writeStream.end(function() {
    self.emit('end');
    cb();
  });
};
//-------FILE END
//-------OctetParser BEGIN
function OctetParser(options){
    if(!(this instanceof OctetParser)) return new OctetParser(options);
    EventEmitter.call(this);
}

util.inherits(OctetParser, EventEmitter);


OctetParser.prototype.write = function(buffer) {
    this.emit('data', buffer);
    return buffer.length;
};

OctetParser.prototype.end = function() {
    this.emit('end');
};
//-------OctetParser END
//-------MultipartParser BEGIN
var Buffer = require('buffer').Buffer,
    s = 0,
    S =
    { PARSER_UNINITIALIZED: s++,
      START: s++,
      START_BOUNDARY: s++,
      HEADER_FIELD_START: s++,
      HEADER_FIELD: s++,
      HEADER_VALUE_START: s++,
      HEADER_VALUE: s++,
      HEADER_VALUE_ALMOST_DONE: s++,
      HEADERS_ALMOST_DONE: s++,
      PART_DATA_START: s++,
      PART_DATA: s++,
      PART_END: s++,
      END: s++
    },

    f = 1,
    F =
    { PART_BOUNDARY: f,
      LAST_BOUNDARY: f *= 2
    },

    LF = 10,
    CR = 13,
    SPACE = 32,
    HYPHEN = 45,
    COLON = 58,
    A = 97,
    Z = 122,

    lower = function(c) {
      return c | 0x20;
    };

function MultipartParser() {
  this.boundary = null;
  this.boundaryChars = null;
  this.lookbehind = null;
  this.state = S.PARSER_UNINITIALIZED;

  this.index = null;
  this.flags = 0;
};
// exports.MultipartParser = MultipartParser;

MultipartParser.stateToString = function(stateNumber) {
  for (var state in S) {
    var number = S[state];
    if (number === stateNumber) return state;
  }
};

MultipartParser.prototype.initWithBoundary = function(str) {
  this.boundary = new Buffer(str.length+4);
  this.boundary.write('\r\n--', 'ascii', 0);
  this.boundary.write(str, 'ascii', 4);
  this.lookbehind = new Buffer(this.boundary.length+8);
  this.state = S.START;

  this.boundaryChars = {};
  for (var i = 0; i < this.boundary.length; i++) {
    this.boundaryChars[this.boundary[i]] = true;
  }
};

MultipartParser.prototype.write = function(buffer) {
  var self = this,
      i = 0,
      len = buffer.length,
      prevIndex = this.index,
      index = this.index,
      state = this.state,
      flags = this.flags,
      lookbehind = this.lookbehind,
      boundary = this.boundary,
      boundaryChars = this.boundaryChars,
      boundaryLength = this.boundary.length,
      boundaryEnd = boundaryLength - 1,
      bufferLength = buffer.length,
      c,
      cl,

      mark = function(name) {
        self[name+'Mark'] = i;
      },
      clear = function(name) {
        delete self[name+'Mark'];
      },
      callback = function(name, buffer, start, end) {
        if (start !== undefined && start === end) {
          return;
        }

        var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
        if (callbackSymbol in self) {
          self[callbackSymbol](buffer, start, end);
        }
      },
      dataCallback = function(name, clear) {
        var markSymbol = name+'Mark';
        if (!(markSymbol in self)) {
          return;
        }

        if (!clear) {
          callback(name, buffer, self[markSymbol], buffer.length);
          self[markSymbol] = 0;
        } else {
          callback(name, buffer, self[markSymbol], i);
          delete self[markSymbol];
        }
      };

  for (i = 0; i < len; i++) {
    c = buffer[i];
    switch (state) {
      case S.PARSER_UNINITIALIZED:
        return i;
      case S.START:
        index = 0;
        state = S.START_BOUNDARY;
      case S.START_BOUNDARY:
        if (index == boundary.length - 2) {
          if (c != CR) {
            return i;
          }
          index++;
          break;
        } else if (index - 1 == boundary.length - 2) {
          if (c != LF) {
            return i;
          }
          index = 0;
          callback('partBegin');
          state = S.HEADER_FIELD_START;
          break;
        }

        if (c != boundary[index+2]) {
          index = -2;
        }
        if (c == boundary[index+2]) {
          index++;
        }
        break;
      case S.HEADER_FIELD_START:
        state = S.HEADER_FIELD;
        mark('headerField');
        index = 0;
      case S.HEADER_FIELD:
        if (c == CR) {
          clear('headerField');
          state = S.HEADERS_ALMOST_DONE;
          break;
        }

        index++;
        if (c == HYPHEN) {
          break;
        }

        if (c == COLON) {
          if (index == 1) {
            // empty header field
            return i;
          }
          dataCallback('headerField', true);
          state = S.HEADER_VALUE_START;
          break;
        }

        cl = lower(c);
        if (cl < A || cl > Z) {
          return i;
        }
        break;
      case S.HEADER_VALUE_START:
        if (c == SPACE) {
          break;
        }

        mark('headerValue');
        state = S.HEADER_VALUE;
      case S.HEADER_VALUE:
        if (c == CR) {
          dataCallback('headerValue', true);
          callback('headerEnd');
          state = S.HEADER_VALUE_ALMOST_DONE;
        }
        break;
      case S.HEADER_VALUE_ALMOST_DONE:
        if (c != LF) {
          return i;
        }
        state = S.HEADER_FIELD_START;
        break;
      case S.HEADERS_ALMOST_DONE:
        if (c != LF) {
          return i;
        }

        callback('headersEnd');
        state = S.PART_DATA_START;
        break;
      case S.PART_DATA_START:
        state = S.PART_DATA;
        mark('partData');
      case S.PART_DATA:
        prevIndex = index;

        if (index == 0) {
          // boyer-moore derrived algorithm to safely skip non-boundary data
          i += boundaryEnd;
          while (i < bufferLength && !(buffer[i] in boundaryChars)) {
            i += boundaryLength;
          }
          i -= boundaryEnd;
          c = buffer[i];
        }

        if (index < boundary.length) {
          if (boundary[index] == c) {
            if (index == 0) {
              dataCallback('partData', true);
            }
            index++;
          } else {
            index = 0;
          }
        } else if (index == boundary.length) {
          index++;
          if (c == CR) {
            // CR = part boundary
            flags |= F.PART_BOUNDARY;
          } else if (c == HYPHEN) {
            // HYPHEN = end boundary
            flags |= F.LAST_BOUNDARY;
          } else {
            index = 0;
          }
        } else if (index - 1 == boundary.length)  {
          if (flags & F.PART_BOUNDARY) {
            index = 0;
            if (c == LF) {
              // unset the PART_BOUNDARY flag
              flags &= ~F.PART_BOUNDARY;
              callback('partEnd');
              callback('partBegin');
              state = S.HEADER_FIELD_START;
              break;
            }
          } else if (flags & F.LAST_BOUNDARY) {
            if (c == HYPHEN) {
              callback('partEnd');
              callback('end');
              state = S.END;
            } else {
              index = 0;
            }
          } else {
            index = 0;
          }
        }

        if (index > 0) {
          // when matching a possible boundary, keep a lookbehind reference
          // in case it turns out to be a false lead
          lookbehind[index-1] = c;
        } else if (prevIndex > 0) {
          // if our boundary turned out to be rubbish, the captured lookbehind
          // belongs to partData
          callback('partData', lookbehind, 0, prevIndex);
          prevIndex = 0;
          mark('partData');

          // reconsider the current character even so it interrupted the sequence
          // it could be the beginning of a new sequence
          i--;
        }

        break;
      case S.END:
        break;
      default:
        return i;
    }
  }

  dataCallback('headerField');
  dataCallback('headerValue');
  dataCallback('partData');

  this.index = index;
  this.state = state;
  this.flags = flags;

  return len;
};

MultipartParser.prototype.end = function() {
  var callback = function(self, name) {
    var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
    if (callbackSymbol in self) {
      self[callbackSymbol]();
    }
  };
  if ((this.state == S.HEADER_FIELD_START && this.index == 0) ||
      (this.state == S.PART_DATA && this.index == this.boundary.length)) {
    callback(this, 'partEnd');
    callback(this, 'end');
  } else if (this.state != S.END) {
    return new Error('MultipartParser.end(): stream ended unexpectedly: ' + this.explain());
  }
};

MultipartParser.prototype.explain = function() {
  return 'state = ' + MultipartParser.stateToString(this.state);
};
//-------MultipartParser END


function IncomingForm(opts) {
  if (!(this instanceof IncomingForm)) return new IncomingForm(opts);
  EventEmitter.call(this);

  opts=opts||{};

  this.error = null;
  this.ended = false;

  this.maxFields = opts.maxFields || 1000;
  this.maxFieldsSize = opts.maxFieldsSize || 2 * 1024 * 1024;
  this.keepExtensions = opts.keepExtensions || false;
  this.uploadDir = opts.uploadDir || os.tmpDir();
  this.encoding = opts.encoding || 'utf-8';
  this.headers = null;
  this.type = null;
  this.hash = false;

  this.bytesReceived = null;
  this.bytesExpected = null;

  this._parser = null;
  this._flushing = 0;
  this._fieldsSize = 0;
  this.openedFiles = [];

  return this;
};
util.inherits(IncomingForm, EventEmitter);
// exports.IncomingForm = IncomingForm;

IncomingForm.prototype.parse = function(req, cb) {
  this.pause = function() {
    try {
      req.pause();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }
    return true;
  };

  this.resume = function() {
    try {
      req.resume();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }

    return true;
  };

  // Setup callback first, so we don't miss anything from data events emitted
  // immediately.
  if (cb) {
    var fields = {}, files = {};
    this
      .on('field', function(name, value) {
        fields[name] = value;
      })
      .on('file', function(name, file) {
        files[name] = file;
      })
      .on('error', function(err) {
        cb(err, fields, files);
      })
      .on('end', function() {
        cb(null, fields, files);
      });
  }

  // Parse headers and setup the parser, ready to start listening for data.
  this.writeHeaders(req.headers);

  // Start listening for data.
  var self = this;
  req
    .on('error', function(err) {
      self._error(err);
    })
    .on('aborted', function() {
      self.emit('aborted');
      self._error(new Error('Request aborted'));
    })
    .on('data', function(buffer) {
      self.write(buffer);
    })
    .on('end', function() {
      if (self.error) {
        return;
      }

      var err = self._parser.end();
      if (err) {
        self._error(err);
      }
    });

  return this;
};

IncomingForm.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this._parseContentLength();
  this._parseContentType();
};

IncomingForm.prototype.write = function(buffer) {
  if (!this._parser) {
    this._error(new Error('unintialized parser'));
    return;
  }

  this.bytesReceived += buffer.length;
  this.emit('progress', this.bytesReceived, this.bytesExpected);

  var bytesParsed = this._parser.write(buffer);
  if (bytesParsed !== buffer.length) {
    this._error(new Error('parser error, '+bytesParsed+' of '+buffer.length+' bytes parsed'));
  }

  return bytesParsed;
};

IncomingForm.prototype.pause = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.resume = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.onPart = function(part) {
  // this method can be overwritten by the user
  this.handlePart(part);
};

IncomingForm.prototype.handlePart = function(part) {
  var self = this;

  if (part.filename === undefined) {
    
    return;
  }

  this._flushing++;

  var file = new File({
    path: this._uploadPath(part.filename),
    name: part.filename,
    type: part.mime,
    hash: self.hash
  });

  this.emit('fileBegin', part.name, file);

  file.open();
  this.openedFiles.push(file);

  part.on('data', function(buffer) {
    self.pause();
    file.write(buffer, function() {
      self.resume();
    });
  });

  part.on('end', function() {
    file.end(function() {
      self._flushing--;
      self.emit('file', part.name, file);
      self._maybeEnd();
    });
  });
};

function dummyParser(self) {
  return {
    end: function () {
      self.ended = true;
      self._maybeEnd();
      return null;
    }
  };
}

IncomingForm.prototype._parseContentType = function() {
  if (this.bytesExpected === 0) {
    this._parser = dummyParser(this);
    return;
  }

  // if (!this.headers['content-type']) {
    // this._error(new Error('bad content-type header, no content-type'));
    // return;
  // }
// 
  if (this.headers['content-type'].match(/octet-stream/i)) {
    this._initOctetStream();
    return;
  }
// 
  // if (this.headers['content-type'].match(/urlencoded/i)) {
    // this._initUrlencoded();
    // return;
  // }

  if (this.headers['content-type'].match(/multipart/i)) {
    var m;
    if (m = this.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i)) {
      this._initMultipart(m[1] || m[2]);
    } else {
      this._error(new Error('bad content-type header, no multipart boundary'));
    }
    return;
  }

  // if (this.headers['content-type'].match(/json/i)) {
    // this._initJSONencoded();
    // return;
  // }

  this._error(new Error('bad content-type header, unknown content-type: '+this.headers['content-type']));
};

IncomingForm.prototype._error = function(err) {
  if (this.error || this.ended) {
    return;
  }

  this.error = err;
  this.pause();
  this.emit('error', err);

  if (Array.isArray(this.openedFiles)) {
    this.openedFiles.forEach(function(file) {
      file._writeStream.destroy();
      setTimeout(fs.unlink, 0, file.path);
    });
  }
};

IncomingForm.prototype._parseContentLength = function() {
  this.bytesReceived = 0;
  if (this.headers['content-length']) {
    this.bytesExpected = parseInt(this.headers['content-length'], 10);
  } else if (this.headers['transfer-encoding'] === undefined) {
    this.bytesExpected = 0;
  }
  
  if (this.maxFieldsSize && this.bytesExpected && this.maxFieldsSize < this.bytesExpected) {
      this._error(new Error('upload file too big!'+this.bytesExpected));
      return ;
  }

  if (this.bytesExpected !== null) {
    this.emit('progress', this.bytesReceived, this.bytesExpected);
  }
};

IncomingForm.prototype._newParser = function() {
  return new MultipartParser();
};

IncomingForm.prototype._initOctetStream = function() {
  this.type = 'octet-stream';
  var filename = this.headers['x-file-name'];
  var mime = this.headers['content-type'];

  var file = new File({
    path: this._uploadPath(filename),
    name: filename,
    type: mime
  });

  file.open();

  this.emit('fileBegin', filename, file);

  this._flushing++;

  var self = this;

  self._parser = new OctetParser();

  //Keep track of writes that haven't finished so we don't emit the file before it's done being written
  var outstandingWrites = 0;

  self._parser.on('data', function(buffer){
    self.pause();
    outstandingWrites++;

    file.write(buffer, function() {
      outstandingWrites--;
      self.resume();

      if(self.ended){
        self._parser.emit('doneWritingFile');
      }
    });
  });

  self._parser.on('end', function(){
    self._flushing--;
    self.ended = true;

    var done = function(){
      self.emit('file', 'file', file);
      self._maybeEnd();
    };

    if(outstandingWrites === 0){
      done();
    } else {
      self._parser.once('doneWritingFile', done);
    }
  });
};

IncomingForm.prototype._initMultipart = function(boundary) {
  this.type = 'multipart';

  var parser = new MultipartParser(),
      self = this,
      headerField,
      headerValue,
      part;

  parser.initWithBoundary(boundary);

  parser.onPartBegin = function() {
    part = new Stream();
    part.readable = true;
    part.headers = {};
    part.name = null;
    part.filename = null;
    part.mime = null;

    part.transferEncoding = 'binary';
    part.transferBuffer = '';

    headerField = '';
    headerValue = '';
  };

  parser.onHeaderField = function(b, start, end) {
    headerField += b.toString(self.encoding, start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString(self.encoding, start, end);
  };

  parser.onHeaderEnd = function() {
    headerField = headerField.toLowerCase();
    part.headers[headerField] = headerValue;

    var m;
    if (headerField == 'content-disposition') {
      if (m = headerValue.match(/\bname="([^"]+)"/i)) {
        part.name = m[1];
      }

      part.filename = self._fileName(headerValue);
    } else if (headerField == 'content-type') {
      part.mime = headerValue;
    } else if (headerField == 'content-transfer-encoding') {
      part.transferEncoding = headerValue.toLowerCase();
    }

    headerField = '';
    headerValue = '';
  };

  parser.onHeadersEnd = function() {
    switch(part.transferEncoding){
      case 'binary':
      case '7bit':
      case '8bit':
      parser.onPartData = function(b, start, end) {
        part.emit('data', b.slice(start, end));
      };

      parser.onPartEnd = function() {
        part.emit('end');
      };
      break;

      case 'base64':
      parser.onPartData = function(b, start, end) {
        part.transferBuffer += b.slice(start, end).toString('ascii');

        /*
        four bytes (chars) in base64 converts to three bytes in binary
        encoding. So we should always work with a number of bytes that
        can be divided by 4, it will result in a number of buytes that
        can be divided vy 3.
        */
        var offset = parseInt(part.transferBuffer.length / 4) * 4;
        part.emit('data', new Buffer(part.transferBuffer.substring(0, offset), 'base64'))
        part.transferBuffer = part.transferBuffer.substring(offset);
      };

      parser.onPartEnd = function() {
        part.emit('data', new Buffer(part.transferBuffer, 'base64'))
        part.emit('end');
      };
      break;

      default:
      return self._error(new Error('unknown transfer-encoding'));
    }

    self.onPart(part);
  };


  parser.onEnd = function() {
    self.ended = true;
    self._maybeEnd();
  };

  this._parser = parser;
};

IncomingForm.prototype._fileName = function(headerValue) {
  var m = headerValue.match(/\bfilename="(.*?)"($|; )/i);
  if (!m) return;

  var filename = m[1].substr(m[1].lastIndexOf('\\') + 1);
  filename = filename.replace(/%22/g, '"');
  filename = filename.replace(/&#([\d]{4});/g, function(m, code) {
    return String.fromCharCode(code);
  });
  return filename;
};



IncomingForm.prototype._uploadPath = function(filename) {
  var name = '';
  for (var i = 0; i < 32; i++) {
    name += Math.floor(Math.random() * 16).toString(16);
  }

  if (this.keepExtensions) {
    var ext = path.extname(filename);
    ext     = ext.replace(/(\.[a-z0-9]+).*/, '$1');

    name += ext;
  }

  return path.join(this.uploadDir, name);
};

IncomingForm.prototype._maybeEnd = function() {
  if (!this.ended || this._flushing || this.error) {
    return;
  }

  this.emit('end');
};
//get file_extention from file_name by '.'
IncomingForm.prototype._dealFileExtention = function(filepath){
    var pos = filepath.lastIndexOf(".");
    var filepart1 = filepath.substring(0,pos),//filename etc.
        filepart2 = filepath.substring(pos);//extision as .gif
    return [filepart1,filepart2];
};
//pick up an unique file name.
IncomingForm.prototype._parseFilePath = function(filepath,i) {
  if ( fs.existsSync(filepath) ) {//存在，则i++进入递归，不存在重名，则返回path
        var tmp = this._dealFileExtention(filepath);
        var filepart1 = tmp[0],
        filepart2 = tmp[1];
        
        if (!i)i=0;
        var match = filepart1.match(/\((\d+)\)$/);
        if (match){
            filepart1 = filepart1.replace(/\((\d+)\)$/,"(" + i + ")");
        }else{
            filepart1 = filepart1+"(1)";
        }
        return this._parseFilePath(filepart1 + filepart2,++i);
    }
    return filepath;
};


IncomingForm.prototype._outputSuccess = function(filename){
    return JSON.stringify({errno:0,data:filename});
};
IncomingForm.prototype._outputError = function(msg){
    return JSON.stringify({errno:1,data:msg});
};
module.exports = IncomingForm;