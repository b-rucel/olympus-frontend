import { render } from "../../testUtils";
import {
  ArrowGraphic,
  CompactVault,
  CompactWallet,
  CompactYield,
  LargeVault,
  LargeWallet,
  LargeYield,
} from "../EducationCard";

describe("<ArrowGraphic/>", () => {
  it("should render component", () => {
    const { container } = render(<ArrowGraphic fill="#999999" />);
    expect(container).toMatchSnapshot();
  });
});

describe("<CompactYield/>", () => {
  it("should render component", () => {
    const { container } = render(<CompactYield quantity={"1"} isQuantityExact={true} />);
    expect(container).toMatchSnapshot();
  });

  it("should render component with quantity not exact", () => {
    const { container } = render(<CompactYield quantity={"1"} isQuantityExact={false} />);
    expect(container).toMatchSnapshot();
  });
});

describe("<CompactVault/>", () => {
  it("should render component", () => {
    const { container } = render(<CompactVault quantity={"1"} isQuantityExact={true} />);
    expect(container).toMatchSnapshot();
  });

  it("should render component with quantity not exact", () => {
    const { container } = render(<CompactVault quantity={"1"} isQuantityExact={false} />);
    expect(container).toMatchSnapshot();
  });
});

describe("<CompactWallet/>", () => {
  it("should render component", () => {
    const { container } = render(<CompactWallet quantity={"1"} isQuantityExact={true} />);
    expect(container).toMatchSnapshot();
  });

  it("should render component with quantity not exact", () => {
    const { container } = render(<CompactWallet quantity={"1"} isQuantityExact={false} />);
    expect(container).toMatchSnapshot();
  });
});

describe("<LargeWallet/>", () => {
  it("should render component", () => {
    const { container } = render(<LargeWallet />);
    expect(container).toMatchSnapshot();
  });
});

describe("<LargeVault/>", () => {
  it("should render component", () => {
    const { container } = render(<LargeVault />);
    expect(container).toMatchSnapshot();
  });
});

describe("<LargeYield/>", () => {
  it("should render component", () => {
    const { container } = render(<LargeYield />);
    expect(container).toMatchSnapshot();
  });
});
