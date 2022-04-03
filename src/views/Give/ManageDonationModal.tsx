import { isAddress } from "@ethersproject/address";
import { t, Trans } from "@lingui/macro";
import { Box, Grid, Link, SvgIcon, Typography } from "@material-ui/core";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { ChevronLeft } from "@material-ui/icons";
import { InfoTooltip, Input, Modal, PrimaryButton, TertiaryButton } from "@olympusdao/component-library";
import { BigNumber } from "bignumber.js";
import MarkdownIt from "markdown-it";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Project, RecordType } from "src/components/GiveProject/project.type";
import { NetworkId } from "src/constants";
import { shorten } from "src/helpers";
import { EnvHelper } from "src/helpers/Environment";
import { GetCorrectContractUnits, GetCorrectStaticUnits } from "src/helpers/GetCorrectUnits";
import { getTotalDonated } from "src/helpers/GetTotalDonated";
import { getRedemptionBalancesAsync } from "src/helpers/GiveRedemptionBalanceHelper";
import { useCurrentIndex } from "src/hooks/useCurrentIndex";
import { useWeb3Context } from "src/hooks/web3Context";
import { hasPendingGiveTxn, PENDING_TXN_EDIT_GIVE, PENDING_TXN_WITHDRAW } from "src/slices/GiveThunk";

import { ArrowGraphic } from "../../components/EducationCard";
import { IPendingTxn, txnButtonText } from "../../slices/PendingTxnsSlice";
import { GohmToggle } from "./GohmToggle";
import { CancelCallback, DonationInfoState, SubmitEditCallback } from "./Interfaces";

export type WithdrawSubmitCallback = {
  (walletAddress: string, id: string, eventSource: string, depositAmount: BigNumber): void;
};

type ManageModalProps = {
  isModalOpen: boolean;
  eventSource: string;
  submitEdit: SubmitEditCallback;
  submitWithdraw: WithdrawSubmitCallback;
  cancelFunc: CancelCallback;
  project?: Project;
  currentDepositId: string;
  currentWalletAddress: string;
  currentDepositAmount: BigNumber; // As per IUserDonationInfo
  depositDate: string;
  giveAssetType: string;
  changeAssetType: (checked: boolean) => void;
  yieldSent: string;
  recordType?: string;
};

BigNumber.config({ EXPONENTIAL_AT: [-10, 20] });

export function ManageDonationModal({
  isModalOpen,
  eventSource,
  submitEdit,
  submitWithdraw,
  cancelFunc,
  project,
  currentDepositId,
  currentWalletAddress,
  currentDepositAmount,
  depositDate,
  giveAssetType,
  changeAssetType,
  yieldSent,
  recordType = RecordType.PROJECT,
}: ManageModalProps) {
  const location = useLocation();
  const { provider, address, connected, networkId } = useWeb3Context();
  const [totalDebt, setTotalDebt] = useState("");
  const [totalDonated, setTotalDonated] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { data: currentIndex } = useCurrentIndex();

  useEffect(() => {
    // We use dispatch to asynchronously fetch the results, and then update state variables so that the component refreshes
    // We DO NOT use dispatch here, because it will overwrite the state variables in the redux store, which then creates havoc
    // e.g. the redeem yield page will show someone else's deposited sOHM and redeemable yield
    if (project) {
      getRedemptionBalancesAsync({
        networkID: networkId,
        provider: provider,
        address: project.wallet,
      })
        .then(resultAction => {
          const correctUnitDebt = GetCorrectContractUnits(
            resultAction.redeeming.recipientInfo.totalDebt,
            giveAssetType,
            currentIndex,
          );

          setTotalDebt(correctUnitDebt);
        })
        .catch(e => console.log(e));

      getTotalDonated({
        networkID: networkId,
        provider: provider,
        address: project.wallet,
      })
        .then(donatedAmount => {
          const correctUnitDonated = GetCorrectContractUnits(donatedAmount, giveAssetType, currentIndex);

          setTotalDonated(correctUnitDonated);
        })
        .catch(e => console.log(e));
    }
  }, [connected, networkId, isModalOpen, giveAssetType]);

  useEffect(() => {
    checkIsWalletAddressValid(getWalletAddress());
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      // When we close the modal, we ensure button click states are reset
      setIsEditing(false);
      setIsWithdrawing(false);
      setIsAmountSet(false);
    }
  }, [isModalOpen]);

  const _initialDepositAmount = 0;
  const _initialWalletAddress = "";
  const _initialDepositAmountValid = false;
  const _initialDepositAmountValidError = "";
  const _initialWalletAddressValid = false;
  const _initialIsAmountSet = false;

  const getInitialDepositAmount = () => {
    return currentDepositAmount
      ? GetCorrectContractUnits(currentDepositAmount.toString(), giveAssetType, currentIndex)
      : _initialDepositAmount;
  };
  const [depositAmount, setDepositAmount] = useState(getInitialDepositAmount());
  const [isDepositAmountValid, setIsDepositAmountValid] = useState(_initialDepositAmountValid);
  const [isDepositAmountValidError, setIsDepositAmountValidError] = useState(_initialDepositAmountValidError);

  const getInitialWalletAddress = () => {
    return currentWalletAddress ? currentWalletAddress : _initialWalletAddress;
  };
  const [walletAddress, setWalletAddress] = useState(getInitialWalletAddress());
  const [isWalletAddressValid, setIsWalletAddressValid] = useState(_initialWalletAddressValid);

  const [isAmountSet, setIsAmountSet] = useState(_initialIsAmountSet);
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const isMediumScreen = useMediaQuery("(max-width: 960px)") && !isSmallScreen;

  const sohmBalance: string = useSelector((state: DonationInfoState) => {
    return networkId === NetworkId.TESTNET_RINKEBY && EnvHelper.isMockSohmEnabled(location.search)
      ? state.account.balances && state.account.balances.mockSohm
      : state.account.balances && state.account.balances.sohm;
  });

  const gohmBalance: string = useSelector((state: DonationInfoState) => {
    return state.account.balances && state.account.balances.gohm;
  });

  const isAccountLoading: boolean = useSelector((state: DonationInfoState) => {
    return state.account.loading;
  });

  const isGiveLoading: boolean = useSelector((state: DonationInfoState) => {
    return networkId === NetworkId.TESTNET_RINKEBY && EnvHelper.isMockSohmEnabled(location.search)
      ? state.account.mockGiving.loading
      : state.account.giving.loading;
  });

  const pendingTransactions: IPendingTxn[] = useSelector((state: DonationInfoState) => {
    return state.pendingTransactions;
  });

  useEffect(() => {
    setDepositAmount(getInitialDepositAmount());
  }, [giveAssetType]);

  /**
   * Checks if the provided wallet address is valid.
   *
   * This will return false if:
   * - it is an invalid Ethereum address
   * - it is the same as the sender address
   *
   * @param {string} value the proposed value for the wallet address
   */
  const checkIsWalletAddressValid = (value: string) => {
    if (!isAddress(value)) {
      setIsWalletAddressValid(false);
      return;
    }

    if (value == address) {
      setIsWalletAddressValid(false);
      return;
    }

    setIsWalletAddressValid(true);
  };

  const handleEditSubmit = () => {
    const depositAmountBig = getCurrentDepositAmount();

    submitEdit(getWalletAddress(), currentDepositId, eventSource, depositAmountBig, getDepositAmountDiff());
  };

  const handleWithdrawSubmit = () => {
    const depositAmountBig = getCurrentDepositAmount();

    submitWithdraw(getWalletAddress(), currentDepositId, eventSource, depositAmountBig);
  };

  /**
   * Indicates whether the form can be submitted.
   *
   * This will return false if:
   * - the deposit amount is invalid
   * - the wallet address is invalid
   * - there is no sender address
   * - an add/edit transaction is pending
   * - it is not in create mode and there is no difference in the amount
   *
   * @returns boolean
   */
  const canSubmit = (): boolean => {
    console.log("1");
    if (!isDepositAmountValid) return false;
    console.log("2");
    if (isAccountLoading || isGiveLoading) return false;
    console.log("3");

    // The wallet address is only set when a project is not given
    console.log(project);
    if (!project && !isWalletAddressValid) return false;
    console.log("4");

    if (!address) return false;
    console.log("5");
    if (hasPendingGiveTxn(pendingTransactions)) return false;
    console.log("6");
    console.log(getDepositAmountDiff().toString());
    if (getDepositAmountDiff().isEqualTo(0)) return false;

    return true;
  };

  const canWithdraw = () => {
    if (!address) return false;
    if (hasPendingGiveTxn(pendingTransactions)) return false;

    return true;
  };

  const getBalance = (): BigNumber => {
    return giveAssetType === "sOHM" ? new BigNumber(sohmBalance) : new BigNumber(gohmBalance);
  };

  const getCurrentDepositAmount = (): BigNumber => {
    if (!currentDepositAmount) return new BigNumber(0);

    const correctUnitCurrDeposit = GetCorrectContractUnits(
      currentDepositAmount.toString(),
      giveAssetType,
      currentIndex,
    );

    return new BigNumber(correctUnitCurrDeposit);
  };

  /**
   * Returns the maximum deposit that can be directed to the recipient.
   *
   * This is equal to the current wallet balance and the current deposit amount (in the vault).
   *
   * @returns BigNumber
   */
  const getMaximumDepositAmount = (): BigNumber => {
    return getBalance().plus(currentDepositAmount ? getCurrentDepositAmount() : 0);
  };

  const getDepositAmountDiff = (): BigNumber => {
    // We can't trust the accuracy of floating point arithmetic of standard JS libraries, so we use BigNumber
    return getDepositAmount().minus(getCurrentDepositAmount());
  };

  /**
   * Ensures that the depositAmount returned is a valid number.
   *
   * @returns
   */
  const getDepositAmount = (): BigNumber => {
    if (!depositAmount) return new BigNumber(0);

    return new BigNumber(depositAmount);
  };

  const handleSetDepositAmount = (value: string) => {
    checkIsDepositAmountValid(value);
    setDepositAmount(parseFloat(value));
  };

  const checkIsDepositAmountValid = (value: string) => {
    const valueNumber = new BigNumber(value);
    const balanceNumber = getBalance();

    if (!value || value == "" || valueNumber.isEqualTo(0)) {
      setIsDepositAmountValid(false);
      setIsDepositAmountValidError(t`Please enter a value`);
      return;
    }

    if (valueNumber.isLessThan(0)) {
      setIsDepositAmountValid(false);
      setIsDepositAmountValidError(t`Value must be positive`);
      return;
    }

    if (balanceNumber.isEqualTo(0)) {
      setIsDepositAmountValid(false);
      setIsDepositAmountValidError(t`You must have a balance of ${giveAssetType} to continue`);
    }

    if (getDepositAmountDiff().isGreaterThan(getBalance())) {
      setIsDepositAmountValid(false);
      setIsDepositAmountValidError(
        t`Value cannot be more than your ${giveAssetType} balance of ` + getMaximumDepositAmount(),
      );
      return;
    }

    setIsDepositAmountValid(true);
    setIsDepositAmountValidError("");
  };

  /**
   * Returns the wallet address. If a project is defined, it uses the
   * project wallet, else what was passed in as a parameter.
   */
  const getWalletAddress = (): string => {
    if (project) return project.wallet;

    return walletAddress;
  };

  /**
   * Returns the appropriate title of the recipient.
   * - No project: shortened wallet address
   * - Project without a separate owner value: project title
   * - Otherwise the project title and owner
   */
  const getRecipientTitle = (): string => {
    if (!project) return shorten(walletAddress);

    if (!project.owner) return project.title;

    return project.owner + " - " + project.title;
  };

  const getRenderedDetails = () => {
    return {
      __html: MarkdownIt({ html: true }).renderInline(project ? project.shortDescription : ""),
    };
  };

  const getModalTitle = (): string => {
    if (isEditing) {
      return "Edit";
    } else if (isWithdrawing) {
      return "Stop";
    } else {
      return "Manage";
    }
  };

  const handleGoBack = () => {
    if (isAmountSet) {
      setIsAmountSet(false);
    } else if (isEditing) {
      setIsEditing(false);
    } else if (isWithdrawing) {
      setIsWithdrawing(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setIsAmountSet(false);
    setIsEditing(false);
    setIsWithdrawing(false);

    // Fire callback
    cancelFunc();
  };

  const getEscapeComponent = () => {
    // If on the edit/stop/confirmation screen, we provide a chevron to go back a step
    if (shouldShowEditConfirmationScreen() || shouldShowEditScreen() || shouldShowStopScreen()) {
      return (
        <Link onClick={() => handleGoBack()}>
          <SvgIcon color="primary" component={ChevronLeft} />
        </Link>
      );
    }

    // Don't display on the first screen
    return <></>;
  };

  /**
   * Content for initial screen (not editing or withdrawing)
   */
  const getInitialScreen = () => {
    return (
      <div>
        <GohmToggle giveAssetType={giveAssetType} changeAssetType={changeAssetType} />
        <div className="manage-project-info">{getRecipientDetails()}</div>
        {recordType === RecordType.PROJECT ? (
          <div className="manage-project-stats-container">{getProjectStats()}</div>
        ) : (
          <></>
        )}
        <div className="manage-donation-details">
          <Box className="donation-details">{getDonationDetails()}</Box>
        </div>
        <div className="manage-buttons">
          <PrimaryButton style={{ marginBottom: "20px" }} onClick={() => setIsEditing(true)}>
            Edit Donation
          </PrimaryButton>
          <TertiaryButton onClick={() => setIsWithdrawing(true)}>Stop Donation</TertiaryButton>
        </div>
      </div>
    );
  };

  /**
   * Elements to display project statistics, such as donation sOHM, yield and goal achievement.
   */
  const getProjectStats = () => {
    return (
      <div className="manage-project-stats">
        <Box className="project-stats-box">
          <Typography variant="h5" align="center" className="project-stat-top">
            {project
              ? new BigNumber(
                  GetCorrectStaticUnits(project.depositGoal.toString(), giveAssetType, currentIndex),
                ).toFixed(2)
              : "N/A"}
          </Typography>
          <Typography variant="body1" align="center" className="subtext">
            {isSmallScreen ? "Goal" : `${giveAssetType} Goal`}
          </Typography>
        </Box>
        <Box className="project-stats-box center-item">
          <Typography variant="h5" align="center" className="project-stat-top">
            {project ? new BigNumber(totalDebt).toFixed(2) : "N/A"}
          </Typography>
          <Typography variant="body1" align="center" className="subtext">
            {isSmallScreen ? `Total ${giveAssetType}` : `Total ${giveAssetType} Donated`}
          </Typography>
        </Box>
        <Box className="project-stats-box">
          <Typography variant="h5" align="center" className="project-stat-top">
            {project ? new BigNumber((parseFloat(totalDonated) / project.depositGoal) * 100).toFixed(1) + "%" : "N/A"}
          </Typography>
          <Typography variant="body1" align="center" className="subtext">
            {isSmallScreen ? "of Goal" : `of ${giveAssetType} Goal`}
          </Typography>
        </Box>
      </div>
    );
  };

  /**
   * Returns elements detailing the user's donation
   */
  const getDonationDetails = () => {
    return (
      <>
        <div className="details-header">
          <Typography variant="h5" style={isAmountSet ? { marginBottom: "0px" } : {}}>
            Donation Details
          </Typography>
        </div>
        <div className="details-container">
          <div className="details-row">
            <Typography variant="h6" className="row-title">
              Date
            </Typography>
            <Typography variant="h6">{depositDate}</Typography>
          </div>
          <div className="details-row">
            <Typography variant="h6" className="row-title">
              Recipient
            </Typography>
            <Typography variant="h6">{getRecipientTitle()}</Typography>
          </div>
          <div className="details-row">
            <Typography variant="h6" className="row-title">
              Deposited
            </Typography>
            <Typography variant="h6">
              {new BigNumber(
                GetCorrectContractUnits(currentDepositAmount.toString(), giveAssetType, currentIndex),
              ).toFixed(2)}{" "}
              {giveAssetType}
            </Typography>
          </div>
          <div className="details-row">
            <Typography variant="h6" className="row-title">
              Yield Sent
            </Typography>
            <Typography variant="h6">
              {yieldSent} {giveAssetType}
            </Typography>
          </div>
        </div>
      </>
    );
  };

  /**
   * Renders the details of the recipient, whether a project or custom recipient.
   */
  const getRecipientDetails = () => {
    if (project) {
      return (
        <div className="project">
          <div className="cause-image">
            <img width="100%" src={`${process.env.PUBLIC_URL}${project.photos[0]}`} />
          </div>
          <div className="cause-content">
            <Grid container className="cause-header">
              <Grid item className="cause-title">
                <Typography variant="h6">
                  <strong>{getRecipientTitle()}</strong>
                </Typography>
              </Grid>
            </Grid>
            <div className="cause-body">
              <Typography variant="body1" className="project-description" style={{ lineHeight: "20px" }}>
                <div dangerouslySetInnerHTML={getRenderedDetails()} />
              </Typography>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="project">
        <div className="cause-content">
          <Grid container className="cause-header">
            <Typography variant="h6">Custom Recipient</Typography>
          </Grid>
          <Grid item className="cause-body">
            <Typography variant="body2">{walletAddress}</Typography>
          </Grid>
        </div>
      </div>
    );
  };

  /**
   * Indicates whether the edit confirmation screen should be displayed.
   *
   * The edit confirmation screen is displayed if the amount is set.
   *
   * @returns boolean
   */
  const shouldShowEditConfirmationScreen = () => {
    return isAmountSet;
  };

  /**
   * Edit screen before altering the amount
   */
  const shouldShowEditScreen = () => {
    return isEditing && !isAmountSet;
  };

  /**
   * Stop/withdraw screen
   */
  const shouldShowStopScreen = () => {
    return isWithdrawing;
  };

  const getEditDonationScreen = () => {
    return (
      <div>
        <GohmToggle giveAssetType={giveAssetType} changeAssetType={changeAssetType} />
        <div className="manage-project-info">{getRecipientDetails()}</div>
        <div className="manage-project-stats-container">{getProjectStats()}</div>
        <div className="manage-donation-details">
          <Box className="donation-details">
            <div className="edit-entry-section">
              <div className="give-modal-alloc-tip">
                <Typography variant="body1">
                  <Trans>New {giveAssetType} Amount</Trans>
                </Typography>
                <InfoTooltip
                  message={t`Your ${giveAssetType} will be tansferred into the vault when you submit. You will need to approve the transaction and pay for gas fees.`}
                  children={null}
                />
              </div>
              <Input
                id="amount-input"
                type="number"
                placeholder={t`Enter an amount`}
                value={getDepositAmount().isEqualTo(0) ? null : getDepositAmount()}
                helperText={
                  isDepositAmountValid
                    ? t`Your current deposit is ${getCurrentDepositAmount().toFixed(2)} ${giveAssetType}`
                    : isDepositAmountValidError
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e: any) => handleSetDepositAmount(e.target.value)}
                error={!isDepositAmountValid}
                startAdornment="sOHM"
                endString={t`Max`}
                endStringOnClick={() => handleSetDepositAmount(getMaximumDepositAmount().toFixed())}
              />
            </div>
          </Box>
        </div>
        <div className="manage-buttons">
          <PrimaryButton disabled={!canSubmit()} onClick={() => setIsAmountSet(true)}>
            <Trans>Continue</Trans>
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const getStopDonationScreen = () => {
    return (
      <div>
        <GohmToggle giveAssetType={giveAssetType} changeAssetType={changeAssetType} />
        <div className="manage-project-info">{getRecipientDetails()}</div>
        <div className="manage-project-stats-container">{getProjectStats()}</div>
        <div className="manage-donation-details">
          <Box className="donation-details">
            <div className="details-row">
              <div className="sohm-allocation-col">
                <Typography variant="body1">
                  <Trans>Current {giveAssetType} deposit</Trans>
                </Typography>
                <Typography variant="h6">
                  {getCurrentDepositAmount().toFixed(2)} {giveAssetType}
                </Typography>
              </div>
              {!isSmallScreen && <ArrowGraphic />}
              <div className="recipient-address-col">
                <Typography variant="body1">
                  <Trans>New {giveAssetType} deposit</Trans>
                </Typography>
                <Typography variant="h6">
                  {isWithdrawing ? 0 : getCurrentDepositAmount().toFixed(2)} {giveAssetType}
                </Typography>
              </div>
            </div>
          </Box>
        </div>
        <div className="manage-buttons">
          <PrimaryButton disabled={!canWithdraw()} onClick={handleWithdrawSubmit} style={{ marginBottom: "20px" }}>
            {txnButtonText(pendingTransactions, PENDING_TXN_WITHDRAW, t`Withdraw`)}
          </PrimaryButton>
          <TertiaryButton onClick={() => setIsWithdrawing(false)}>Cancel</TertiaryButton>
        </div>
      </div>
    );
  };

  const getEditConfirmationScreen = () => {
    return (
      <div>
        <div className="manage-project-info">{getRecipientDetails()}</div>
        <div className="manage-project-stats-container">{getProjectStats()}</div>
        <div className="manage-donation-details">
          <Box className="donation-details">
            <div className="details-row">
              <div className="sohm-allocation-col">
                <Typography variant="body1">
                  <Trans>Current {giveAssetType} deposit</Trans>
                </Typography>
                <Typography variant="h6">
                  {getCurrentDepositAmount().toFixed(2)} {giveAssetType}
                </Typography>
              </div>
              {!isSmallScreen && <ArrowGraphic />}
              <div className="recipient-address-col">
                <Typography variant="body1">
                  <Trans>New {giveAssetType} deposit</Trans>
                </Typography>
                <Typography variant="h6">
                  {isWithdrawing ? 0 : getDepositAmount().toFixed(2)} {giveAssetType}
                </Typography>
              </div>
            </div>
          </Box>
        </div>
        <div className="manage-buttons">
          <PrimaryButton disabled={!canSubmit()} onClick={handleEditSubmit}>
            {txnButtonText(pendingTransactions, PENDING_TXN_EDIT_GIVE, t`Confirm New ${giveAssetType}`)}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  // NOTE: the following warning is caused by the amount-input field:
  // Warning: `value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.%s
  // This is caused by this line (currently 423):
  // value={getDepositAmount().isEqualTo(0) ? null : getDepositAmount()}
  // If we set the value to an empty string instead of null, any decimal number that is entered will not be accepted
  // This appears to be due to the following bug (which is still not resolved);
  // https://github.com/facebook/react/issues/11877

  return (
    <Modal
      open={isModalOpen}
      onClose={handleClose}
      headerText={getModalTitle() + " Donation"}
      closePosition="right"
      topLeft={getEscapeComponent()}
      className={`ohm-modal ${isMediumScreen ? "medium" : isSmallScreen ? "smaller" : ""}`}
      minHeight="300px"
    >
      {shouldShowEditScreen()
        ? getEditDonationScreen()
        : shouldShowStopScreen()
        ? getStopDonationScreen()
        : shouldShowEditConfirmationScreen()
        ? getEditConfirmationScreen()
        : getInitialScreen()}
    </Modal>
  );
}
