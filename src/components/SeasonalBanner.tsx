import type { WheelId } from '../../shared/types.ts'
import { wheelLabel } from '../../shared/calendar.ts'

type Props = {
  wheel: WheelId
  preview: boolean
}

export function SeasonalBanner({ wheel, preview }: Props) {
  if (wheel === 'halloween') {
    return (
      <p className="season-banner halloween">
        {preview ? 'Previewing ' : ''}October — Halloween wheel is up. Only Halloween movies belong here.
        Your regular Friday picks are saved for November.
      </p>
    )
  }
  if (wheel === 'christmas') {
    return (
      <p className="season-banner christmas">
        {preview ? 'Previewing ' : ''}December — Christmas wheel is up. Only Christmas movies belong here.
        Your regular Friday picks are saved for January.
      </p>
    )
  }
  return <p className="season-banner regular">{wheelLabel(wheel)}</p>
}
