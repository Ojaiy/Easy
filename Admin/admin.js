const API_BASE =
'http://localhost:5000/api/v1';

const Admin = (() => {

    const token =
        localStorage.getItem(
            'easyship_token'
        );

    const user =
        JSON.parse(
            localStorage.getItem(
                'easyship_user'
            )
        );

    const headers = {
        'Content-Type':
            'application/json',

        Authorization:
            `Bearer ${token}`
    };

    const init = () => {

        if (!token || !user) {

            window.location.href =
                '../User/index.html';

            return;
        }

        document
            .getElementById(
                'close-review-modal'
            )
            ?.addEventListener(
                'click',
                () => {

                    document
                        .getElementById(
                            'review-modal'
                        )
                        .classList
                        .remove(
                            'active'
                        );

                }
            );

        if (user.role !== 'admin') {

            alert(
                'Access denied'
            );

            window.location.href =
                '../User/index.html';

            return;
        }

        setupNavigation();

        setupUser();

        setupLogout();

        setupRiderForm();

        loadDashboard();

        loadRiders();

        loadApprovedRiders();

        loadRejectedRiders();

        loadCustomers();

        loadOrders();
    };

    const setupUser = () => {

        document.getElementById(
            'admin-name'
        ).textContent =
            user.name;

        document.getElementById(
            'admin-avatar'
        ).textContent =
            user.name
            .split(' ')
            .map(x => x[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const setupNavigation = () => {

        const items =
            document.querySelectorAll(
                '.nav-item'
            );

        items.forEach(item => {

            item.addEventListener(
                'click',
                e => {

                    e.preventDefault();

                    items.forEach(x =>
                        x.classList.remove(
                            'active'
                        )
                    );

                    item.classList.add(
                        'active'
                    );

                    const page =
                        item.dataset.page;

                    document
                        .querySelectorAll(
                            '.page'
                        )
                        .forEach(p =>
                            p.classList.remove(
                                'active'
                            )
                        );

                    document
                        .getElementById(
                            `page-${page}`
                        )
                        .classList.add(
                            'active'
                        );

                    document
                        .getElementById(
                            'page-title'
                        )
                        .textContent =
                            item.innerText.trim();
                }
            );

        });

    };

    const setupLogout = () => {

        document
            .getElementById(
                'logout-btn'
            )
            .addEventListener(
                'click',
                () => {

                    localStorage.removeItem(
                        'easyship_token'
                    );

                    localStorage.removeItem(
                        'easyship_user'
                    );

                    window.location.href =
                        '../User/index.html';
                }
            );

    };

    const loadDashboard =
    async () => {

        const res =
            await fetch(
                `${API_BASE}/admin/dashboard`,
                {
                    headers
                }
            );

        const data =
            await res.json();

        if (!data.success) return;

        document.getElementById(
            'total-customers'
        ).textContent =
            data.stats.totalCustomers;

        document.getElementById(
            'total-riders'
        ).textContent =
            data.stats.totalRiders;

        document.getElementById(
            'total-orders'
        ).textContent =
            data.stats.totalOrders;

        document.getElementById(
            'pending-orders'
        ).textContent =
            data.stats.pendingOrders;

        document.getElementById(
            'delivered-orders'
        ).textContent =
            data.stats.deliveredOrders;

        document.getElementById(
            'cancelled-orders'
        ).textContent =
            data.stats.cancelledOrders;
    };

    const loadRiders =
        async () => {

        const res =
        await fetch(
            `${API_BASE}/admin/pending-riders`,
            {
                headers
            }
        );

    const data =
        await res.json();
        console.log(data);

    const container =
        document.getElementById(
            'riders-container'
        );

    container.innerHTML = '';

    data.riders.forEach(
        rider => {

            container.innerHTML += `
            <div class="data-card">

                <h3>
                    ${rider.firstName}
                    ${rider.lastName}
                </h3>

                <p>
                    ${rider.email}
                </p>

                <p>
                    ${rider.phone}
                </p>

                <p>
                    Vehicle:
                    ${rider.vehicleType}
                </p>

                <p>
                    Plate:
                    ${rider.plateNumber}
                </p>

                <div class="card-actions">

                    <button
                        class="primary-btn"
                        onclick="
                    Admin.reviewRider(
                    '${rider._id}'
                            )"              >
                        Review
                    </button>

                    <button
                        class="delete-btn"
                        onclick="
                        Admin.rejectRider(
                            '${rider._id}'
                        )
                        "
                    >
                        Reject
                    </button>

                </div>

            </div>
            `;

        }
    );

};

const loadApprovedRiders =
async () => {

    const res =
        await fetch(
            `${API_BASE}/admin/approved-riders`,
            {
                headers
            }
        );

    const data =
        await res.json();

    const container =
        document.getElementById(
            'approved-riders-container'
        );

    container.innerHTML = '';

    data.riders.forEach(
        rider => {

            container.innerHTML += `
                <div class="data-card">

                    <h3>
                        ${rider.firstName}
                        ${rider.lastName}
                    </h3>

                    <p>
                        ${rider.email}
                    </p>

                    <p>
                        ${rider.phone}
                    </p>

                    <p>
                        Status:
                        Approved
                    </p>

                </div>
            `;

        }
    );

};

const loadRejectedRiders =
async () => {

    const res =
        await fetch(
            `${API_BASE}/admin/rejected-riders`,
            {
                headers
            }
        );

    const data =
        await res.json();

    const container =
        document.getElementById(
            'rejected-riders-container'
        );

    container.innerHTML = '';

    data.riders.forEach(
        rider => {

            container.innerHTML += `
                <div class="data-card">

                    <h3>
                        ${rider.firstName}
                        ${rider.lastName}
                    </h3>

                    <p>
                        ${rider.email}
                    </p>

                    <p>
                        ${rider.phone}
                    </p>

                    <p>
                        Status:
                        Rejected
                    </p>

                </div>
            `;

        }
    );

};


      const reviewRider =
async id => {

    const res =
        await fetch(
            `${API_BASE}/admin/pending-riders`,
            {
                headers
            }
        );

    const data =
        await res.json();

    const rider =
        data.riders.find(
            x => x._id === id
        );

    if (!rider) return;

    document
        .getElementById(
            'review-body'
        )
        .innerHTML = `

        <div class="review-grid">

            <div class="review-section">

                <h3>
                    Personal Information
                </h3>

                <p>
                    Name:
                    ${rider.firstName}
                    ${rider.lastName}
                </p>

                <p>
                    Email:
                    ${rider.email}
                </p>

                <p>
                    Phone:
                    ${rider.phone}
                </p>

                <p>
                    DOB:
                    ${rider.dateOfBirth}
                </p>

                <p>
                    Address:
                    ${rider.address}
                </p>

                <img
                    src="${rider.profilePhoto}"
                    class="review-image"
                >
                
    href="${rider.driversLicense}"
    target="_blank"
    class="document-link"
    >
    View Driver's License
    </a>

    
    href="${rider.governmentId}"
    target="_blank"
    class="document-link"
    >
    View Government ID
    </a>

    
    href="${rider.vehicleRegistration}"
    target="_blank"
    class="document-link"
    >
    View Vehicle Registration
    </a>

            </div>


            <div class="review-section">

                <h3>
                    Vehicle Information
                </h3>

                <p>
                    Type:
                    ${rider.vehicleType}
                </p>

                <p>
                    Brand:
                    ${rider.vehicleBrand}
                </p>

                <p>
                    Model:
                    ${rider.vehicleModel}
                </p>

                <p>
                    Color:
                    ${rider.vehicleColor}
                </p>

                <p>
                    Plate:
                    ${rider.plateNumber}
                </p>

                <img
                    src="${rider.vehiclePhoto}"
                    class="review-image"
                >

            </div>

        </div>

        <div
            class="card-actions"
            style="
                margin-top:30px;
                justify-content:center;
            "
        >

            <button
                class="primary-btn"
                onclick="
                Admin.approveRider(
                    '${rider._id}'
                )
                "
            >
                Approve Rider
            </button>

            <button
                class="delete-btn"
                onclick="
                Admin.rejectRider(
                    '${rider._id}'
                )
                "
            >
                Reject Rider
            </button>

        </div>
    `;

    document
        .getElementById(
            'review-modal'
        )
        .classList
        .add(
            'active'
        );

};

    const deleteRider =
    async id => {

        const confirmed =
            confirm(
                'Delete rider?'
            );

        if (!confirmed) return;

        await fetch(
            `${API_BASE}/admin/riders/${id}`,
            {
                method: 'DELETE',
                headers
            }
        );

        loadRiders();

        loadDashboard();
    };

    const approveRider =
async id => {

    await fetch(
        `${API_BASE}/admin/riders/${id}/approve`,
        {
            method: 'PATCH',
            headers
        }
    );

    loadRiders();

    loadApprovedRiders();

    document
        .getElementById(
            'review-modal'
        )
        ?.classList
        .remove(
            'active'
        );

};

const rejectRider =
async id => {

    await fetch(
        `${API_BASE}/admin/riders/${id}/reject`,
        {
            method: 'PATCH',
            headers
        }
    );

    loadRiders();

    loadRejectedRiders();

    document
        .getElementById(
            'review-modal'
        )
        ?.classList
        .remove(
            'active'
        );

};
    const setupRiderForm =
    () => {

        document
            .getElementById(
                'rider-form'
            )
            .addEventListener(
                'submit',
                async e => {

                    e.preventDefault();

                    const body = {

                        name:
                        document
                        .getElementById(
                            'rider-name'
                        )
                        .value,

                        email:
                        document
                        .getElementById(
                            'rider-email'
                        )
                        .value,

                        phone:
                        document
                        .getElementById(
                            'rider-phone'
                        )
                        .value,

                        password:
                        document
                        .getElementById(
                            'rider-password'
                        )
                        .value
                    };

                    const res =
                        await fetch(
                            `${API_BASE}/admin/riders`,
                            {
                                method: 'POST',
                                headers,
                                body:
                                JSON.stringify(
                                    body
                                )
                            }
                        );

                    const data =
                        await res.json();

                    alert(
                        data.message
                    );

                    document
                        .getElementById(
                            'rider-modal'
                        )
                        .classList
                        .remove(
                            'active'
                        );

                    e.target.reset();

                    loadRiders();

                    loadDashboard();

                }
            );

    };

    const loadCustomers =
    async () => {

        const res =
            await fetch(
                `${API_BASE}/admin/customers`,
                {
                    headers
                }
            );

        const data =
            await res.json();

        const container =
            document.getElementById(
                'customers-container'
            );

        container.innerHTML = '';

        data.customers.forEach(
            customer => {

                container.innerHTML += `
                <div class="data-card">

                    <h3>
                        ${customer.name}
                    </h3>

                    <p>
                        ${customer.email}
                    </p>

                    <p>
                        ${customer.phone}
                    </p>

                    <div class="card-actions">

                        <button
                        class="delete-btn"
                        onclick="
                        Admin.deleteCustomer(
                        '${customer._id}'
                        )">

                        Delete

                        </button>

                    </div>

                </div>
                `;
            }
        );

    };

    const deleteCustomer =
    async id => {

        const confirmed =
            confirm(
                'Delete customer?'
            );

        if (!confirmed) return;

        await fetch(
            `${API_BASE}/admin/customers/${id}`,
            {
                method: 'DELETE',
                headers
            }
        );

        loadCustomers();

        loadDashboard();
    };

    const loadOrders =
    async () => {

        const res =
            await fetch(
                `${API_BASE}/admin/orders`,
                {
                    headers
                }
            );

        const data =
            await res.json();

        const container =
            document.getElementById(
                'orders-container'
            );

        container.innerHTML = '';

        data.orders.forEach(
            order => {

                container.innerHTML += `
                <div class="data-card">

                    <h3>
                        ${order.pickup.address}
                    </h3>

                    <p>
                        To:
                        ${order.dropoff.address}
                    </p>

                    <p>
                        Status:
                        ${order.status}
                    </p>

                    <p>
                        Customer:
                        ${
                            order.customerId?.name
                            || 'Unknown'
                        }
                    </p>

                    <div class="card-actions">

                        <button
                        class="cancel-btn"
                        onclick="
                        Admin.cancelOrder(
                        '${order._id}'
                        )">

                        Cancel

                        </button>

                    </div>

                </div>
                `;
            }
        );

    };

    const cancelOrder =
    async id => {

        const reason =
            prompt(
                'Reason for cancellation'
            );

        if (!reason) return;

        await fetch(
            `${API_BASE}/admin/orders/${id}/cancel`,
            {
                method: 'PATCH',
                headers,

                body:
                JSON.stringify({
                    reason
                })
            }
        );

        loadOrders();

        loadDashboard();
    };

return {
    init,
    reviewRider,
    approveRider,
    rejectRider,
    deleteRider,
    deleteCustomer,
    cancelOrder
};

})();

document
.addEventListener(
    'DOMContentLoaded',
    () => {

        Admin.init();

        lucide.createIcons();

    }
);