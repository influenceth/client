# Influence Client

The browser game client for Influence.

## Test Environment
1. Initialize your .env file:
    ```
    echo "REACT_APP_API_URL=http://localhost:3001
    REACT_APP_IMAGES_URL=http://localhost:3001
    REACT_APP_BRIDGE_URL=http://localhost:4000
    REACT_APP_STARKNET_NETWORK=http://localhost:9000
    REACT_APP_ETHEREUM_EXPLORER_URL=https://etherscan.io
    REACT_APP_STARKNET_EXPLORER_URL=https://voyager.online
    REACT_APP_ETHEREUM_NFT_MARKET_URL=https://opensea.io
    REACT_APP_ASPECT_URL=https://testnet.aspect.co
    REACT_APP_MINTSQUARE_URL=https://mintsquare.io
    REACT_APP_MINTSQUARE_MODIFIER=starknet-testnet/

    # (this is the devnet >0.4 token address)
    REACT_APP_ERC20_TOKEN_ADDRESS=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
    REACT_APP_STARKNET_DISPATCHER=

    REACT_APP_HIDE_SOCIAL=false

    SKIP_PREFLIGHT_CHECK=true
    " > .env
    ```
1. Adjust or fill in any missing .env variables as needed.
    > i.e. If you are running starknet devnet, `REACT_APP_STARKNET_DISPATCHER` value is available by running `node bin/printEnv.js` from the `starknet-contracts` project.
1. Run `npm start`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.
