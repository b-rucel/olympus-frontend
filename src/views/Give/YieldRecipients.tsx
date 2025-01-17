import "./YieldRecipients.scss";

import { Trans } from "@lingui/macro";
import { Divider, Grid, Typography, useTheme } from "@material-ui/core";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { Skeleton } from "@material-ui/lab";
import { TertiaryButton } from "@olympusdao/component-library";
import { GiveBox as Box } from "src/components/GiveProject/GiveBox";
import { useDonationInfo } from "src/hooks/useGiveInfo";
import { IButtonChangeView } from "src/views/Give/Interfaces";

import { DepositTableRow } from "./DepositRow";

type RecipientModalProps = {
  changeView: IButtonChangeView;
};

export default function YieldRecipients({ changeView }: RecipientModalProps) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("xs"));

  const rawDonationInfo = useDonationInfo().data;
  const donationInfo = rawDonationInfo ? rawDonationInfo : [];
  const isDonationInfoLoading = useDonationInfo().isLoading;

  const isLoading = isDonationInfoLoading;

  if (isLoading) {
    return <Skeleton />;
  }

  if (!donationInfo || donationInfo.length == 0) {
    return (
      <Box>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} container justifyContent="center">
            <Typography variant="body1">
              <Trans>Looks like you haven’t made any donations yet</Trans>
            </Typography>
          </Grid>
          <Grid item xs={12} container justifyContent="center">
            <TertiaryButton onClick={() => changeView(0)}>
              <Trans>Donate to a cause</Trans>
            </TertiaryButton>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} container>
        {!isSmallScreen && (
          <Grid item xs={2}>
            <Typography variant="body1" className="grey">
              <Trans>DATE</Trans>
            </Typography>
          </Grid>
        )}
        <Grid item xs={4} sm={3}>
          <Typography variant="body1" className="grey">
            <Trans>RECIPIENT</Trans>
          </Typography>
        </Grid>
        {!isSmallScreen && (
          <Grid item xs={2} style={{ textAlign: "right" }}>
            <Typography variant="body1" className="grey">
              <Trans>DEPOSITED</Trans>
            </Typography>
          </Grid>
        )}
        <Grid item xs={4} sm={2} style={{ textAlign: "right" }}>
          <Typography variant="body1" className="grey">
            <Trans>YIELD SENT</Trans>
          </Typography>
        </Grid>
        <Grid item xs={4} sm={3} />
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      {donationInfo.map(donation => {
        return (
          <Grid item xs={12}>
            <DepositTableRow depositObject={donation} key={donation.recipient} />
            <Divider style={{ marginTop: "10px" }} />
          </Grid>
        );
      })}
    </Grid>
  );
}
