import { makeStyles } from "@material-ui/core";
import { Redirect, Route, Switch } from "react-router-dom";
import Transfer from "./components/Transfer";
import { COLORS } from "./muiTheme";

import { useState, useEffect, useMemo } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { Button, Grid } from "@material-ui/core";
import { Provider } from "@project-serum/anchor";
// @ts-ignore
import Wallet from "@project-serum/sol-wallet-adapter";
import {
  Signer,
  ConfirmOptions,
  Connection,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  TokenListContainer,
  TokenListProvider,
} from "@solana/spl-token-registry";
// import Swap from "@project-serum/swap-ui";

// const useStyles = makeStyles((theme) => ({
//   appBar: {
//     background: COLORS.nearBlackWithMinorTransparency,
//     "& > .MuiToolbar-root": {
//       margin: "auto",
//       width: "100%",
//       maxWidth: 1100,
//     },
//   },
//   spacer: {
//     flex: 1,
//     width: "100vw",
//   },
//   link: {
//     ...theme.typography.body1,
//     color: theme.palette.text.primary,
//     marginLeft: theme.spacing(6),
//     [theme.breakpoints.down("sm")]: {
//       marginLeft: theme.spacing(2.5),
//     },
//     [theme.breakpoints.down("xs")]: {
//       marginLeft: theme.spacing(1),
//     },
//     "&.active": {
//       color: theme.palette.primary.light,
//     },
//   },
//   bg: {
//     background:
//       "linear-gradient(160deg, rgba(69,74,117,.1) 0%, rgba(138,146,178,.1) 33%, rgba(69,74,117,.1) 66%, rgba(98,104,143,.1) 100%), linear-gradient(45deg, rgba(153,69,255,.1) 0%, rgba(121,98,231,.1) 20%, rgba(0,209,140,.1) 100%)",
//     display: "flex",
//     flexDirection: "column",
//     minHeight: "100vh",
//   },
//   content: {
//     margin: theme.spacing(2, 0),
//     [theme.breakpoints.up("md")]: {
//       margin: theme.spacing(4, 0),
//     },
//   },
//   brandLink: {
//     display: "inline-flex",
//     alignItems: "center",
//     "&:hover": {
//       textDecoration: "none",
//     },
//   },
//   brandText: {
//     ...theme.typography.h5,
//     [theme.breakpoints.down("xs")]: {
//       fontSize: 22,
//     },
//     fontWeight: "500",
//     background: `linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 100%);`,
//     WebkitBackgroundClip: "text",
//     backgroundClip: "text",
//     WebkitTextFillColor: "transparent",
//     MozBackgroundClip: "text",
//     MozTextFillColor: "transparent",
//     letterSpacing: "3px",
//     display: "inline-block",
//     marginLeft: theme.spacing(0.5),
//   },
//   iconButton: {
//     [theme.breakpoints.up("md")]: {
//       marginRight: theme.spacing(2.5),
//     },
//     [theme.breakpoints.down("sm")]: {
//       marginRight: theme.spacing(2.5),
//     },
//     [theme.breakpoints.down("xs")]: {
//       marginRight: theme.spacing(1),
//     },
//   },
//   gradientButton: {
//     backgroundImage: `linear-gradient(45deg, ${COLORS.blue} 0%, ${COLORS.nearBlack}20 50%,  ${COLORS.blue}30 62%, ${COLORS.nearBlack}50  120%)`,
//     transition: "0.75s",
//     backgroundSize: "200% auto",
//     boxShadow: "0 0 20px #222",
//     "&:hover": {
//       backgroundPosition:
//         "right center" /* change the direction of the change here */,
//     },
//   },
//   betaBanner: {
//     background: `linear-gradient(to left, ${COLORS.blue}40, ${COLORS.green}40);`,
//     padding: theme.spacing(1, 0),
//   },
//   wormholeIcon: {
//     height: 32,
//     filter: "contrast(0)",
//     transition: "filter 0.5s",
//     "&:hover": {
//       filter: "contrast(1)",
//     },
//     verticalAlign: "middle",
//     marginRight: theme.spacing(1),
//     display: "inline-block",
//   },
// }));

import { PublicKey } from "@solana/web3.js";
// import { TokenListContainer } from "@solana/spl-token-registry";
// import { Provider } from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import {
  createMuiTheme,
  ThemeOptions,
  ThemeProvider,
} from "@material-ui/core/styles";
import {
  SwapContextProvider,
  useSwapContext,
  useSwapFair,
} from "./components/context/Swap";

import {
  DexContextProvider,
  useBbo,
  useFairRoute,
  useMarketName,
} from "./components/context/Dex";

import { TokenListContextProvider, useTokenMap } from "./components/context/TokenList";
import { TokenContextProvider, useMint } from "./components/context/Token";

function App() {
  // const classes = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const [isConnected, setIsConnected] = useState(false);
  const [tokenList, setTokenList] = useState<TokenListContainer | null>(null);

  const [provider, wallet] = useMemo(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    const network = "https://solana-api.projectserum.com";
    const wallet = new Wallet("https://www.sollet.io", network);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new NotifyingProvider(
      connection,
      wallet,
      opts,
      (tx, err) => {
        if (err) {
          enqueueSnackbar(`Error: ${err.toString()}`, {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Transaction sent", {
            variant: "success",
            action: (
              <Button
                color="inherit"
                component="a"
                target="_blank"
                rel="noopener"
                href={`https://explorer.solana.com/tx/${tx}`}
              >
                View on Solana Explorer
              </Button>
            ),
          });
        }
      }
    );
    return [provider, wallet];
  }, [enqueueSnackbar]);

  useEffect(() => {
    new TokenListProvider().resolve().then(setTokenList);
  }, [setTokenList]);

  // Connect to the wallet.
  useEffect(() => {
    wallet.on("connect", () => {
      enqueueSnackbar("Wallet connected", { variant: "success" });
      setIsConnected(true);
    });
    wallet.on("disconnect", () => {
      enqueueSnackbar("Wallet disconnected", { variant: "info" });
      setIsConnected(false);
    });
  }, [wallet, enqueueSnackbar]);
  
  const tmp:any = tokenList;
  const swapClient = new SwapClient(provider, tmp);
  return (
    <TokenListContextProvider tokenList={tokenList}>
      <TokenContextProvider provider={provider}>
        <DexContextProvider swapClient={swapClient}>   
          <SwapContextProvider>
            <div >      
              <div >
                <Switch>
                  <Route exact path="/transfer">
                    <Transfer />
                  </Route>                       
                  <Route exact path="/">
                    <Transfer />
                  </Route>
                  <Route>
                    <Redirect to="/" />
                  </Route>
                </Switch>
              </div>      
            </div>
          </SwapContextProvider>
        </DexContextProvider>
      </TokenContextProvider>
    </TokenListContextProvider>
  );
}

class NotifyingProvider extends Provider {
  // Function to call whenever the provider sends a transaction;
  private onTransaction: (
    tx: TransactionSignature | undefined,
    err?: Error
  ) => void;

  constructor(
    connection: Connection,
    wallet: Wallet,
    opts: ConfirmOptions,
    onTransaction: (tx: TransactionSignature | undefined, err?: Error) => void
  ) {
    const _wallet:any = wallet;
    super(connection, _wallet, opts);
    this.onTransaction = onTransaction;
  }

  async send(
    tx: Transaction,
    signers?: Array<Signer | undefined>,
    opts?: ConfirmOptions
  ): Promise<TransactionSignature> {
    try {
      const txSig = await super.send(tx, signers, opts);
      this.onTransaction(txSig);
      return txSig;
    } catch (err) {
      // this.onTransaction(undefined, err);
      return "";
    }
  }

  async sendAll(
    txs: Array<{ tx: Transaction; signers: Array<Signer | undefined> }>,
    opts?: ConfirmOptions
  ): Promise<Array<TransactionSignature>> {
    try {
      const txSigs = await super.sendAll(txs, opts);
      txSigs.forEach((sig) => {
        this.onTransaction(sig);
      });
      return txSigs;
    } catch (err) {
      // this.onTransaction(undefined, err);
      return [];
    }
  }
}

export default App;
