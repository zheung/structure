'use strict'

const gui = {
	init() {
		this.tabs = TabGroup({
			name : "main"
		})
		
		this.dvTabs = createElement("div", "tabs", document.body)
		
		this.map = this.tabs.addTab("map", "Map", MapTab)
		this.sliders = this.tabs.addTab("sliders", "Sliders", SlidersTab)
		this.skills = this.tabs.addTab("skills", "Skills", SkillsTab)
		this.management = this.tabs.addTab("management", "Management", ManagementTab)	
		
		this.tabs.addTab("stardust", "Stardust", StardustTab)
		this.tabs.addTab("magic", "Magic")
		this.tabs.addFiller()

		this.story = this.tabs.addTab("story", "Story", StoryTab)
		this.menu = this.tabs.addTab("menu", "Menu", MenuTab)
		
		this.tabs.toggleDisplay("story", false)
		
		//Header
		this.dvHeader = createElement("div", "header", this.skills.dvDisplay)
		this.dvGold = createElement("div", "gold", this.dvHeader)
		this.dvExp = createElement("div", "exp", this.dvHeader)
		this.dvExpMult = createElement("div", "exp-mult", this.dvHeader)
		this.dvMana = createElement("div", "mana", this.dvHeader)
		this.dvScience = createElement("div", "science", this.dvHeader)
		
		this.backgroundContext = this.map.background.getContext("2d")
		this.foregroundContext = this.map.foreground.getContext("2d")
		
		this.tabs.setTab("map")

		this.target = GuiPointElement({
			className : "target", 
			parent : this.map.dvDisplay,
			
			_init() {
				this.dvDisplay.onmousemove = (event) => gui.hover.reset()
				this.pointDisplay = PointInfoDisplay({
					className : "point-info",
					parent : this.dvDisplay,
				})
				this.dvSliders = createElement("div", "sliders", this.dvDisplay)
				this.dvSliders.onclick = (event) => event.target == this.dvSliders?this.reset():0
				
				this.dvHint = createElement("div", "target-hint", this.dvSliders, "Click to assign/free:")
				this.dvUpgrades = createElement("div", "upgrades", this.dvDisplay)
				this.dvUpgrades.onclick = (event) => event.target == this.dvUpgrades?this.reset():0
				
				this.buttons = {}
				
				this.buttons.levelUp = IconButton({
					parent: this.dvUpgrades, 
					onclick: (event) => {
						if (this.point) {
							this.point.levelUp()
							this.updatePosition()
						}
					},
					available: () => (this.point.level || 0) < POINT_MAX_LEVEL && game.resources.gold >= this.point.costs.levelUp,
					visible: () => game.skills.upgradePoints && (!this.point || !this.point.boss && (!this.point.level || this.point.level < POINT_MAX_LEVEL)),
					iconText: "⇮", 
					iconColor: "#003300",
					text: () => this.point?"Level up\nGold: " + displayNumber(this.point.costs.levelUp):""
				})
				
				this.dvBuildings = createElement("div", "buildings", this.dvUpgrades)
				this.dvBuildings.onclick = (event) => event.target == this.dvBuildings?this.reset():0
	
				Object.values(BUILDINGS).map(x => {
					this.buttons[x.id] = IconButton({
						parent: this.dvBuildings,
						onclick: (event) => {
							if (this.point) {
								this.point.build(x.id)
								this.updateUpgrades()
							}
						},
						available: () => (this.point && this.point.costs[x.id] <= game.resources.gold),
						visible: () => game.skills["build"+x.level] && this.point && this.point.level && this.point.level >= x.level && (this.point.buildings[x.id] || this.point.costs[x.id] >= 0),
						owned: () => this.point && this.point.buildings[x.id],
						iconText: x.iconText,
						iconColor: x.iconColor,
						desc : x.desc,
						text: () => x.name + "\n" + (this.point?this.point.buildings[x.id]?x.info.call(this.point):"Gold: "+displayNumber(this.point.costs[x.id]):"?")
					})
				})
			},
			
			align(x, y) {
				let width = this.dvDisplay.offsetWidth
				let height = this.dvDisplay.offsetHeight
				x = ((x + width + 5< viewport.width) ? (x + 5) : (x - 5 - width))
				y = y - height / 2
				x = Math.max(1, Math.min(viewport.width - width - 1, x))
				y = Math.max(1, Math.min(viewport.height - height - 1, y))
				this.dvDisplay.style.left = x + "px"
				this.dvDisplay.style.top = y+"px"
			},
			
			updatePosition() {
				let width = this.dvDisplay.offsetWidth
				let height = this.dvDisplay.offsetHeight
				let x = this.dvDisplay.offsetLeft
				let y = this.dvDisplay.offsetTop
				if (!y) return
				x = Math.max(0, Math.min(viewport.width - width, x))
				y = Math.max(0, Math.min(viewport.height - height, y))
				this.dvDisplay.style.left = x + "px"
				this.dvDisplay.style.top = y+"px"			
			},
	
			onSet () {
				mouse.state = MOUSE_STATE_INFO
				this.pointDisplay.set(this.point)
				
				game.sliders.map((slider, n) => {
					slider.getReal()
					slider.dvTarget.classList.toggle("notransition",true)
					this.dvSliders.appendChild(slider.dvTarget)
					slider.dvTarget.offsetWidth && slider.dvTarget.classList.toggle("notransition",false)
				})
				
				Object.values(this.buttons).map (x => x.dvDisplay.classList.toggle("notransition", true))
				this.updateUpgrades()
				Object.values(this.buttons).map (x => x.dvDisplay.offsetWidth && x.dvDisplay.classList.toggle("notransition", false))
			},
			
			update() {
				if (!this.point) return
				this.pointDisplay.update()

				const mode = (this.point.away == 1)?1:
							(game.skills.mining && !this.point.index)?2:
							(game.skills.upgradePoints && this.point.index)?3:
							0
				
				const displaySliders = mode == 1 || mode == 2
				this.dvSliders.classList.toggle("hidden", !displaySliders)
	
				if (displaySliders)
					game.sliders.map(slider => slider.updateTarget(this.point))
				
				this.dvUpgrades.classList.toggle("hidden", mode != 3)
				if (mode == 3) {
					Object.values(this.buttons).map(x => x.updateAvailability())
				}
			},
			
			updateUpgrades() {
				Object.values(this.buttons).map(x => x.update())
			},
			
			onReset() {
				if (mouse.state == MOUSE_STATE_INFO)
					mouse.state = MOUSE_STATE_FREE
				game.sliders.map((slider, n) => {
					slider.dvTarget && slider.dvTarget.remove()
				})
				this.pointDisplay.reset()
			}
		})
	
		this.hover = GuiPointElement({
			className : "hover",
			parent : this.map.dvDisplay,
			
			_init() {
				this.pointDisplay = PointInfoDisplay({
					className : "point-info",
					parent : this.dvDisplay,
				})
				this.dvBuildings = createElement("div", "icons", this.dvDisplay)
				this.icons = Object.keys(BUILDINGS).map(x => BuildingIcon(x, this.dvBuildings))
			},

			align(x, y) {
				let width = this.dvDisplay.offsetWidth
				let height = this.dvDisplay.offsetHeight
				x = ((x + width + 5 < viewport.width) ? (x + 5) : (x - 5 - width))
				y = y
				x = Math.max(0, Math.min(viewport.width - width, x))
				y = Math.max(0, Math.min(viewport.height - height, y))
				this.dvDisplay.style.left = x + "px"
				this.dvDisplay.style.top = y + "px"			
			},
	
			update() {
				this.pointDisplay.update()
			}, 
			
			onSet() {
				this.pointDisplay.set(this.point)
				if (this.point) {
					this.icons.map (x => {
						x.dvDisplay.classList.toggle("hidden", !(this.point.buildings && this.point.buildings[x.id] || (this.point.costs && this.point.level && this.point.level >= x.building.level && game.skills["build" + x.building.level] && this.point.costs[x.id] > -1)))
						x.dvDisplay.classList.toggle("unbought", !(this.point.buildings && this.point.buildings[x.id]))
					})
				}
			},

			onReset() {
				this.pointDisplay.reset()
			},
		})
		
		this.target.reset(true)
		this.hover.reset(true)
	},	
	
	updateTabs() {
		let distress = game.map.markers && game.map.markers.length
		this.map.dvAscend.innerText = distress?"Ascend(📡\uFE0E"+game.map.markers.length+")":game.map.boss?"Ascend(⚔\uFE0E)":"Ascend (🌟\uFE0E" + game.map.ascendCost + ")"
		this.map.dvAscend.classList.toggle("disabled",distress || game.resources.stars < game.map.ascendCost && !game.map.boss || game.map.boss && game.map.points.filter(x => !x.owned && x.boss == game.map.boss).length)
		this.map.dvAscend.classList.toggle("hidden", !game.statistics.stars)
		this.dvMana.classList.toggle("hidden", !game.skills.magic)
		this.dvScience.classList.toggle("hidden", !game.resources.science)
		this.map.dvDisplay.classList.toggle("dark", !!game.map.boss)
		this.map.dvDisplay.classList.toggle("complete", !!game.map.complete)
		this.tabs.setTitle("sliders", game.sliders.length > 1?game.sliders.length+" "+"Sliders":"Slider")
		this.tabs.toggleDisplay("skills", game.map.level)
		this.tabs.toggleDisplay("management", game.skills.management)
		this.tabs.toggleDisplay("stardust", game.skills.stardust)
		this.tabs.toggleDisplay("magic", game.skills.magic)
	},
	
	updateSaves(target) {
		this.menu.saves.update(true, target)
	},
	
	update() {
		const activeTab = this[this.tabs.activeTab]
		
		activeTab && activeTab.update && activeTab.update()
		
		if (this.tabs.activeTab == "sliders" || this.tabs.activeTab == "skills" || this.tabs.activeTab == "management") {
			this.dvExp.innerText = "Exp: " + displayNumber(game.resources.exp) + (game.real.production.exp?(game.real.production.exp>0?" (+":" (")+displayNumber(game.real.production.exp)+"/s)":"")
			if (game.skills.magic)
				this.dvMana.innerText = "Mana: " + displayNumber(game.resources.mana) + (game.real.production.mana?(game.real.production.mana>0?" (+":" (")+displayNumber(game.real.production.mana)+"/s)":"")
			if (game.resources.science)
				this.dvScience.innerText = "Science: " + displayNumber(game.resources.science) + (game.real.production.science?(game.real.production.science>0?" (+":" (")+displayNumber(game.real.production.science)+"/s)":"")
		}
		
		if (this.tabs.activeTab == "management")
			this.dvGold.innerText = "Gold: " + displayNumber(game.resources.gold) + (game.real.production.gold?(game.real.production.gold>0?" (+":" (")+displayNumber(game.real.production.gold)+"/s)":"")
		
		this.target.update()
		this.hover.update()
	},
}