import { useGame } from '../context';
import { levelFor } from '../../shared/game';
import { ScreenHeading, ItemBrowser } from '../components/PhoneUI';
import Icon from '../components/Icon';
export default function Market() {
  const { state } = useGame();
  return (
    <div className="compact-page shop-page">
      <ScreenHeading title="Shop">
        <span className="level-chip">
          <Icon name="star" size={15} />
          Lv. {levelFor(state.xp)}
        </span>
      </ScreenHeading>
      <ItemBrowser mode="shop" />
    </div>
  );
}
