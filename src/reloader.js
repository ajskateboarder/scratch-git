(() => {
  let reloader = new EventSource("http://localhost:3333/listen");
  reloader.onmessage = () => location.reload();
})();
