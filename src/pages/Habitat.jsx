import { useState } from 'react';
import { useGame } from '../context';
import {
  ScreenHeading,
  PetScene,
  QuickCare,
  ItemBrowser,
  CompanionPicker,
  Segments,
} from '../components/PhoneUI';
import Icon from '../components/Icon';
import Dialog from '../components/Dialog';
import CompanionChat from '../components/CompanionChat';
export default function Habitat() {
  const { state, act, busy } = useGame();
  const [tab, setTab] = useState('bag'),
    [rename, setRename] = useState(false),
    [chat, setChat] = useState(false),
    [name, setName] = useState(state.pet.name);
  return (
    <div className="compact-page pets-page">
      <ScreenHeading title="Pets">
        <button
          className="button secondary companion-chat-open"
          aria-label="Talk to your companion"
          onClick={() => setChat(true)}
        >
          <Icon name="chat" size={17} /> Chat
        </button>
        <button
          className="icon-button"
          aria-label="Rename companion"
          onClick={() => {
            setName(state.pet.name);
            setRename(true);
          }}
        >
          <Icon name="edit" size={19} />
        </button>
      </ScreenHeading>
      <PetScene large />
      <QuickCare />
      <Segments
        label="Pet tools"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'bag', name: 'Backpack', icon: 'backpack' },
          { id: 'friends', name: 'Friends', icon: 'paw' },
        ]}
      />
      <div className="pet-tool-panel">
        {tab === 'bag' ? (
          <ItemBrowser mode="bag" />
        ) : (
          <CompanionPicker
            value={state.pet.species}
            busy={busy}
            onChange={(species) => act({ type: 'pet.switch', species })}
          />
        )}
      </div>
      {chat && <CompanionChat onClose={() => setChat(false)} />}
      {rename && (
        <Dialog title="Name your companion" onClose={() => setRename(false)}>
          <form
            className="dialog-body filter-sheet"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({
                  type: 'profile.update',
                  name: state.name,
                  petName: name,
                  species: state.pet.species,
                  timezone: state.timezone,
                })
              )
                setRename(false);
            }}
          >
            <label>
              Companion name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
            </label>
            <button className="button primary full-width" disabled={busy}>
              Save
              <Icon name="check" size={17} />
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
