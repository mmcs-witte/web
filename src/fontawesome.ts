import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faUser,
  faHome,
  faCog,
  faPalette,
  faCat,
  faRuler,
  faArrowPointer
} from '@fortawesome/free-solid-svg-icons'
import {
  faUser as farUser,
  faClock as farClock
} from '@fortawesome/free-regular-svg-icons'
import {
  faGithub as fabGithub,
  faTwitter as fabTwitter,
} from '@fortawesome/free-brands-svg-icons'

// Add icons to the library
library.add(
  faUser,
  faHome,
  faCog,
  faCat,
  faPalette,
  faRuler,
  faArrowPointer,
  farUser,
  farClock,
  fabGithub,
  fabTwitter
)

export { FontAwesomeIcon }
