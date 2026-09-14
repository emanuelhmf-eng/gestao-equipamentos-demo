class DashboardService{

    async carregar(){

        return await window.api.dashboard.carregar();

    }

}

window.dashboardService =

new DashboardService();