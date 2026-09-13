export const SAMPLE_TITLE = "Midterm drill";

// String.raw keeps LaTeX backslashes intact — in a normal template literal
// "\frac" would become a form feed followed by "rac".
export const SAMPLE_SOURCE = String.raw`# Lines starting with # are ignored. Use them for notes to yourself.

Q: Which layer of the OSI model does a router operate at?
- Layer 2, data link
* Layer 3, network
- Layer 4, transport
- Layer 7, application
> Routers forward packets using IP addresses, which live at layer 3.

Q: Solve for $x$: $x^2 - 5x + 6 = 0$
- $x = 1$ or $x = 6$
* $x = 2$ or $x = 3$
- $x = -2$ or $x = -3$
- No real solutions
> Factor it: $(x - 2)(x - 3) = 0$.

Q: Which of these series converge?
* $\sum_{n=1}^{\infty} \frac{1}{n^2}$
- $\sum_{n=1}^{\infty} \frac{1}{n}$
* $\sum_{n=1}^{\infty} \frac{1}{2^n}$
- $\sum_{n=1}^{\infty} \frac{1}{\sqrt{n}}$
> A $p$-series $\sum 1/n^p$ converges when $p > 1$. The harmonic series diverges.

Q: Evaluate $$\int_0^1 3x^2 \, dx$$
- $0$
* $1$
- $3$
- $\frac{1}{3}$
> The antiderivative is $x^3$, so the result is $1^3 - 0^3 = 1$.

Q: Which of these are valid HTTP methods?
* GET
* PATCH
- FETCH
* DELETE
- RETRIEVE
> FETCH and RETRIEVE are not HTTP methods. fetch() is a browser API.

Q: In Big-O notation, what is the average cost of a hash table lookup?
* $O(1)$
- $O(\log n)$
- $O(n)$
- $O(n \log n)$
> Average case is constant. The worst case degrades to $O(n)$ when every key collides.
`;
