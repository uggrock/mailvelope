
self.port.on('parse', function(message) {
  self.port.emit(message.response, DOMPurify.sanitize(message.data));
});
