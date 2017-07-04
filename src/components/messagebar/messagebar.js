import $ from 'dom7';
import Utils from '../../utils/utils';
import Messagebar from './messagebar-class';

export default {
  name: 'messagebar',
  static: {
    Messagebar,
  },
  create() {
    const app = this;
    const messagebar = {
      create(params) {
        return new Messagebar(app, params);
      },
      get(messagebarEl) {
        const $messagebarEl = $(messagebarEl);
        if ($messagebarEl.length && $messagebarEl[0].f7Searchbar) {
          return $messagebarEl[0].f7Searchbar;
        }
        return undefined;
      },
    };
    Utils.extend(app, {
      messagebar,
    });
  },
  on: {
    tabBeforeRemove(tabEl) {
      const app = this;
      $(tabEl).find('.messagebar-init').each((index, messagebarEl) => {
        app.messagebar.destroy(messagebarEl);
      });
    },
    tabMounted(tabEl) {
      const app = this;
      $(tabEl).find('.messagebar-init').each((index, messagebarEl) => {
        app.messagebar.create(Utils.extend({ el: messagebarEl }, $(messagebarEl).dataset()));
      });
    },
    pageBeforeRemove(page) {
      const app = this;
      page.$el.find('.messagebar-init').each((index, messagebarEl) => {
        app.messagebar.destroy(messagebarEl);
      });
    },
    pageInit(page) {
      const app = this;
      page.$el.find('.messagebar-init').each((index, messagebarEl) => {
        app.messagebar.create(Utils.extend({ el: messagebarEl }, $(messagebarEl).dataset()));
      });
    },
  },
  clicks: {

  },
};