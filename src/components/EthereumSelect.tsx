import {
    ListItemIcon,
    ListItemText,
    makeStyles,
    MenuItem,
    OutlinedTextFieldProps,
    TextField,
  } from "@material-ui/core";
  import clsx from "clsx";  
  import { NFTParsedTokenAccount } from "../store/nftSlice";

  const useStyles = makeStyles((theme) => ({
    select: {
      "& .MuiSelect-root": {
        display: "flex",
        alignItems: "center",
      },
    },
    listItemIcon: {
      minWidth: 40,
    },
    icon: {
      height: 24,
      maxWidth: 24,
    },
  }));

  interface MarketParsedTokenAccount extends NFTParsedTokenAccount {
    markets?: string[];
  }

  const createChainMenuItem = (index: number, { mintKey, symbol, logo }: MarketParsedTokenAccount, classes: any) => (
    <MenuItem key={index} value={index}>
      <ListItemIcon className={classes.listItemIcon}>
        <img src={logo} alt={symbol} className={classes.icon} />
      </ListItemIcon>
      <ListItemText>{symbol}{' (Ethereum)'}</ListItemText>
    </MenuItem>
  );
  
  interface TokenSelectProps extends OutlinedTextFieldProps {
    tokens: MarketParsedTokenAccount[];
  }
  
  export default function EthereumSelect({ tokens, ...rest }: TokenSelectProps) {
    const classes = useStyles();    
    return (
      <TextField {...rest} className={clsx(classes.select, rest.className)}>
        {tokens.map((token, index) => createChainMenuItem(index, token, classes))}
      </TextField>
    );
  }
  