import {prepareCommonRoll, prepareCombatRoll, preparePsychicPowerRoll} from "../../common/dialog.js";

export class DarkHeresySheet extends ActorSheet {
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-create").click(ev => this._onItemCreate(ev));
    html.find(".item-edit").click(ev => this._onItemEdit(ev));
    html.find(".item-delete").click(ev => this._onItemDelete(ev));
    html.find("input").focusin(ev => this._onFocusIn(ev));
    html.find(".roll-characteristic").click(async ev => await this._prepareRollCharacteristic(ev));
    html.find(".roll-skill").click(async ev => await this._prepareRollSkill(ev));
    html.find(".roll-speciality").click(async ev => await this._prepareRollSpeciality(ev));
    html.find(".roll-insanity").click(async ev => await this._prepareRollInsanity(ev));
    html.find(".roll-corruption").click(async ev => await this._prepareRollCorruption(ev));
    html.find(".roll-weapon").click(async ev => await this._prepareRollWeapon(ev));
    html.find(".roll-psychic-power").click(async ev => await this._prepareRollPsychicPower(ev));
  }

  /** @override */
  getData() {
    const data = super.getData();
    data.data = data.data.data
    return data
  }

  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/dark-heresy/template/sheet/actor/limited-sheet.html";
    } else {
      return this.options.template;
    }
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if (this.actor.isOwner) {
      buttons = [
        {
          label: game.i18n.localize("BUTTON.ROLL"),
          class: "custom-roll",
          icon: "fas fa-dice",
          onclick: async (ev) => await this._prepareCustomRoll()
        }
      ].concat(buttons);
    }
    return buttons;
  }

  _onItemCreate(event) {
    event.preventDefault();
    let header = event.currentTarget.dataset
    
    let data = {
         name : `New ${game.i18n.localize("ITEM.Type" + header.type.toLowerCase().capitalize())}`,
         type : header.type
    };
    this.actor.createEmbeddedDocuments("Item", [data], { renderSheet: true });
}
  _onItemEdit(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    let item = this.actor.items.get(div.data("itemId"));
    item.sheet.render(true);
  }

  _onItemDelete(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    this.actor.deleteEmbeddedDocuments("Item", [div.data("itemId")]);
    div.slideUp(200, () => this.render(false));
  }

  _onFocusIn(event) {
    $(event.currentTarget).select();
  }

  async _prepareCustomRoll() {
    const rollData = {
      name: "DIALOG.CUSTOM_ROLL",
      baseTarget: 50,
      modifier: 0
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollCharacteristic(event) {
    event.preventDefault();
    const characteristicName = $(event.currentTarget).data("characteristic");
    const characteristic = this.actor.characteristics[characteristicName];
    const rollData = {
      name: characteristic.label,
      baseTarget: characteristic.total,
      modifier: 0
    };
    await prepareCommonRoll(rollData);
  }

  _getCharacteristicOptions (selected) {
    const characteristics = []
    for (let char of Object.values(this.actor.characteristics)) {
      characteristics.push({
        label: char.label,
        target: char.total,
        selected: char.short === selected
      })
    }
    return characteristics
  }

  async _prepareRollSkill(event) {
    event.preventDefault();
    const skillName = $(event.currentTarget).data("skill");
    const skill = this.actor.skills[skillName];
    const defaultChar = skill.defaultCharacteristic || skill.characteristics[0]

    let characteristics = this._getCharacteristicOptions(defaultChar)
    characteristics = characteristics.map((char) => {
      char.target += skill.advance
      return char
    })

    const rollData = {
      name: skill.label,
      baseTarget: skill.total,
      modifier: 0,
      characteristics: characteristics
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollSpeciality(event) {
    event.preventDefault();
    const skillName = $(event.currentTarget).parents(".item").data("skill");
    const specialityName = $(event.currentTarget).data("speciality");
    const skill = this.actor.skills[skillName];
    const speciality = skill.specialities[specialityName];
    const rollData = {
      name: speciality.label,
      baseTarget: speciality.total,
      modifier: 0
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollInsanity(event) {
    event.preventDefault();
    const characteristic = this.actor.characteristics.willpower;
    const rollData = {
      name: "FEAR.HEADER",
      baseTarget: characteristic.total,
      modifier: 0
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollCorruption(event) {
    event.preventDefault();
    const characteristic = this.actor.characteristics.willpower;
    const rollData = {
      name: "CORRUPTION.HEADER",
      baseTarget: characteristic.total,
      modifier: this._getCorruptionModifier()
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollWeapon(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const weapon = this.actor.items.get(div.data("itemId"));
    let characteristic = this._getWeaponCharacteristic(weapon);
    let rateOfFire;
    if (weapon.class === "melee") {
      rateOfFire = {burst: characteristic.bonus, full: characteristic.bonus};
    } else {
      rateOfFire = {burst: weapon.rateOfFire.burst, full: weapon.rateOfFire.full};
    }
    let rollData = {
      item: weapon,
      name: weapon.name,
      baseTarget: characteristic.total + weapon.attack,
      modifier: 0,
      isMelee: weapon.class === "melee",
      isRange: !(weapon.class === "melee"),
      clip: weapon.clip,
      damageFormula: weapon.damage,
      damageBonus: (weapon.class === "melee") ? this.actor.characteristics.strength.bonus : 0,
      damageType: weapon.damageType,
      penetrationFormula: weapon.penetration,
      rateOfFire: rateOfFire,
      special: weapon.special,
      psy: {value: this.actor.psy.rating, display: false},
    };
    await prepareCombatRoll(rollData, this.actor);
  }

  async _prepareRollPsychicPower(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const psychocPower = this.actor.items.get(div.data("itemId"));
    let characteristic = this._getPsychicPowerCharacteristic(psychicPower);
    const rollData = {
      name: psychicPower.name,
      baseTarget: characteristic.total,
      modifier: psychicPower.focusPower.difficulty,
      damageFormula: psychicPower.damage.formula,
      psy: {value: 1, max: this.actor.psy.rating, display: true},
      damageType: psychicPower.damage.type,
      damageBonus: 0,
      penetrationFormula: psychicPower.damage.penetration,
      attackType: {name: psychicPower.zone}
    };
    await preparePsychicPowerRoll(rollData);
  }

  _getCorruptionModifier() {
    const corruption = this.actor.corruption;
    if (corruption <= 30) {
      return 0;
    } else if (corruption >= 31 && corruption <= 60) {
      return -10;
    } else if (corruption >= 61 && corruption <= 90) {
      return -20;
    } else if (corruption >= 91) {
      return -30;
    }
  }

  _getWeaponCharacteristic(weapon) {
    if (weapon.class === "melee") {
      return this.actor.characteristics.weaponSkill;
    } else {
      return this.actor.characteristics.ballisticSkill;
    }
  }

  _getPsychicPowerCharacteristic(psychicPower) {
    const normalizeName = psychicPower.focusPower.test.toLowerCase();
    if (this.actor.characteristics.hasOwnProperty(normalizeName)) {
      return this.actor.characteristics[normalizeName];
    } else {
      return this.actor.characteristics.willpower;
    }
  }
}
