/** Left half: lens cluster, main display, D-pad, action buttons and search. */
import type { JSX } from 'react';
import type { DeviceController } from '../hooks/useDeviceController';
import { CaptionedButton } from './DeviceButton';
import { DPad } from './DPad';
import { Screw, Vents } from './Hardware';
import { LensCluster } from './LensCluster';
import { MainScreen } from './MainScreen';
import { SearchSlot } from './SearchSlot';

export function LeftPanel({ device }: { device: DeviceController }): JSX.Element {
  return (
    <section className="half half--left" aria-label="Pokédex display half">
      <div className="half__face">
        <Screw className="screw--tl" />
        <Screw className="screw--bl" />

        <LensCluster lamps={device.lamps} />

        <MainScreen
          entry={device.entry}
          status={device.status}
          error={device.error}
          isNavigating={device.isNavigating}
          tab={device.mainTab}
          onTabChange={device.setMainTab}
          statusText={device.statusText}
          statusTone={device.statusTone}
          onRetry={device.retry}
          selectedId={device.selectedId}
          index={{
            open: device.indexOpen,
            entries: device.indexEntries,
            status: device.indexStatus,
            error: device.indexError,
            onSelect: device.select,
            onClose: device.closeIndex,
            onRetry: device.reloadIndex,
          }}
        />

        <div className="control-deck">
          <DPad
            onPress={device.pressDpad}
            disabled={{ left: !device.canGoPrev, right: !device.canGoNext }}
          />

          <div className="control-deck__actions">
            <div className="action-row">
              <CaptionedButton
                caption="B"
                aria-label="Previous Pokémon (B)"
                onClick={device.goPrev}
                disabled={!device.canGoPrev}
              />
              <CaptionedButton
                caption="A"
                aria-label="Next Pokémon (A)"
                onClick={device.goNext}
                disabled={!device.canGoNext}
              />
            </div>
            <div className="action-row action-row--wide">
              <CaptionedButton
                caption="DATA"
                captionBelow
                variant="yellow"
                aria-label="Show species data"
                held={device.mainTab === 'DATA'}
                onClick={() => device.setMainTab('DATA')}
              />
              <CaptionedButton
                caption="CANCEL"
                captionBelow
                variant="yellow"
                aria-label="Cancel and reset the display"
                onClick={device.cancel}
              />
            </div>
          </div>

          <div className="control-deck__side">
            <Vents />
            <Screw className="screw--static" />
          </div>
        </div>

        <SearchSlot
          value={device.query}
          onChange={device.setQuery}
          onSubmit={device.submitSearch}
        />

        <p className="tagline">EXPLORE • RECORD • DISCOVER</p>
      </div>
    </section>
  );
}
