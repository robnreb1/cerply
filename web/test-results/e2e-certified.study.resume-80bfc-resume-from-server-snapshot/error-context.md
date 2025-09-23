# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Cerply" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Cerply" [ref=e6] [cursor=pointer]
      - navigation [ref=e8]:
        - link "Log in" [ref=e9] [cursor=pointer]:
          - /url: /login
  - generic [ref=e11]:
    - heading "Certified Study Runner" [level=1] [ref=e12]
    - paragraph [ref=e13]: Preview disabled. Set NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true to enable.
  - contentinfo [ref=e14]:
    - navigation [ref=e16]:
      - link "Popular" [ref=e17] [cursor=pointer]:
        - /url: "#popular"
      - link "Certified" [ref=e18] [cursor=pointer]:
        - /url: "#certified"
      - link "Challenge" [ref=e19] [cursor=pointer]:
        - /url: "#challenge"
      - link "Analytics" [ref=e20] [cursor=pointer]:
        - /url: "#analytics"
      - link "Account" [ref=e21] [cursor=pointer]:
        - /url: "#account"
      - link "About" [ref=e22] [cursor=pointer]:
        - /url: "#about"
  - alert [ref=e23]
```