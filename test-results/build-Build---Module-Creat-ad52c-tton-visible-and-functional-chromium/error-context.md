# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "Build Error" [level=1] [ref=e7]
        - paragraph [ref=e8]: Failed to compile
        - generic [ref=e9]:
          - text: Next.js (14.2.32) is outdated
          - link "(learn more)" [ref=e11] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
      - generic [ref=e12]:
        - generic [ref=e13]:
          - link "./node_modules/react-markdown/index.js" [ref=e14] [cursor=pointer]:
            - text: ./node_modules/react-markdown/index.js
            - img [ref=e15]
          - generic [ref=e20]: "Error: ENOENT: no such file or directory, open '/Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/web/node_modules/react-markdown/index.js'"
        - contentinfo [ref=e21]:
          - paragraph [ref=e22]: This error occurred during the build process and can only be dismissed by fixing the error.
```