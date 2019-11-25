# prettier-plugin-pretty-imports

#### Sorted, sectioned imports

Groups and sorts your JavaScript imports when running prettier.

## Demo

#### Before

```javascript
import React from 'react';
import classNames from 'classnames';
import styles from './Form.scss';
import Button from '@/components/common/Button';
import { arrChunk } from '@/helpers/functions';
```

#### After

```javascript
//------------------------------------------------------------------------------
// Node Modules ----------------------------------------------------------------
import classNames from 'classnames';
import React from 'react';
//------------------------------------------------------------------------------
// Style -----------------------------------------------------------------------
import styles from './Form.scss';
//------------------------------------------------------------------------------
// Components ------------------------------------------------------------------
import Button from '@/components/common/Button';
//------------------------------------------------------------------------------
// Helpers ---------------------------------------------------------------------
import { arrChunk } from '@/helpers/functions';
```

## Install

Install [yarn][yarn-install]. Then run:

```bash
> yarn add -D prettier-plugin-pretty-imports
```

Prettier should automatically recognize the plugin in your project. Read more
about [prettier plugins here][prettier-plugins].

[prettier-plugins]: https://prettier.io/docs/en/plugins.html
[yarn-install]: https://yarnpkg.com/lang/en/docs/install/
