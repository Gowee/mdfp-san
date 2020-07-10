# mdfp-san

Search the Subject Alternative Name section of TLS certificates in public [CT logs](https://crt.sh) for possibly related domains (typically, [MDFP domains](https://github.com/EFForg/privacybadger/issues/781)).

## Endpoint

`/search?q={SEARCH_CRITERIA}`

### Deployed Worker

https://mdfp-san.bamboo.workers.dev/

### Example

https://mdfp-san.bamboo.workers.dev/search?q=example.org

## Notes / TODOs

- Still under development to be usable enough. For example, planning to recursively query newly found domains / organizations for better coverage.
- Known to be easily exceed the execution time limit of Cloudflare Worker. Planning to re-implement on other service/platform.
- No Web UI available yet.
- No CI or test.
