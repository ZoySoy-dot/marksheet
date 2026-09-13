export const SAMPLE_TITLE = "Systems midterm — quick drill";

export const SAMPLE_SOURCE = `# Lines starting with # are ignored. Use them for notes to yourself.

Q: Which layer of the OSI model does a router operate at?
- Layer 2, data link
* Layer 3, network
- Layer 4, transport
- Layer 7, application
> Routers forward packets using IP addresses, which live at layer 3.

Q: Which of these are valid HTTP methods?
* GET
* PATCH
- FETCH
* DELETE
- RETRIEVE
> FETCH and RETRIEVE are not HTTP methods. fetch() is a browser API.

Q: What does a 404 status code mean?
- The server refused the request
* The server could not find the requested resource
- The request timed out
- The server hit an internal error

Q: Which statements about Postgres indexes are true?
* They speed up reads and slow down writes
* A primary key creates one automatically
- They are rebuilt on every query
- They remove the need for a WHERE clause

Q: In Big-O notation, what is the average cost of a hash table lookup?
* O(1)
- O(log n)
- O(n)
- O(n log n)
> Average case is constant. The worst case degrades to O(n) when every key collides.
`;
