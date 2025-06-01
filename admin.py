# admin.py (Blueprint)
from flask import Blueprint, render_template, redirect, url_for, session, flash, request
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired
from flask_mysqldb import MySQL
import bcrypt
import pymysql
# from app import mysql  # Import from your main app
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')
# Will be initialized later
mysql = None
def init_admin(mysql_instance):
    global mysql
    mysql = mysql_instance
    return admin_bp
# Admin credentials (or use separate admin table)
ADMIN_USERNAME = "admin@cryptex.com"
ADMIN_PASSWORD = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
# Add test route
@admin_bp.route('/test')
def test_route():
    return "Admin blueprint works!"
# Forms
class AdminLoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')
class CryptoForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired()])
    symbol = StringField('Symbol', validators=[DataRequired()])
    coingecko_id = StringField('CoinGecko ID', validators=[DataRequired()])
    image_filename = StringField('Image Filename')
    submit = SubmitField('Submit')
# Helper functions
def is_admin_logged_in():
    return 'admin_logged_in' in session
# Routes
@admin_bp.route('/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        print("Login attempt detected")  # Debug
    if is_admin_logged_in():
        return redirect(url_for('admin.admin_dashboard'))
    
    form = AdminLoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        
        if username == ADMIN_USERNAME and bcrypt.checkpw(password.encode('utf-8'), ADMIN_PASSWORD):
            session['admin_logged_in'] = True
            return redirect(url_for('admin.admin_dashboard'))
        else:
            flash('Invalid credentials', 'danger')
    
    return render_template('admin/login.html', form=form)
@admin_bp.route('/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('You have been logged out', 'info')
    return redirect(url_for('admin.admin_login'))
@admin_bp.route('/dashboard')
def admin_dashboard():
    print("Dashboard route hit")  # Debug
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    # Get stats
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT COUNT(*) as total_users FROM user")
    total_users = cursor.fetchone()['total_users']
    
    cursor.execute("SELECT COUNT(*) as total_transactions FROM transactions")
    total_transactions = cursor.fetchone()['total_transactions']
    
    cursor.close()
    
    return render_template('admin/dashboard.html', 
                         total_users=total_users,
                         total_transactions=total_transactions)
@admin_bp.route('/users')
def manage_users():
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM user ORDER BY id DESC")
    users = cursor.fetchall()
    cursor.close()
    
    return render_template('admin/users.html', users=users)
@admin_bp.route('/transactions')
def view_transactions():
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    cursor = mysql.connection.cursor()
    query = """
    SELECT t.*, u.username, c.symbol 
    FROM transactions t
    JOIN user u ON t.user_id = u.id
    JOIN cryptocurrency c ON t.crypto_id = c.id
    ORDER BY t.created_at DESC
    """
    cursor.execute(query)
    transactions = cursor.fetchall()
    cursor.close()
    
    return render_template('admin/transactions.html', transactions=transactions)
# Crypto CRUD Routes
@admin_bp.route('/cryptos')
def manage_cryptos():
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM cryptocurrency")
    cryptos = cursor.fetchall()
    cursor.close()
    
    return render_template('admin/cryptos/list.html', cryptos=cryptos)
@admin_bp.route('/cryptos/add', methods=['GET', 'POST'])
def add_crypto():
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    form = CryptoForm()
    if form.validate_on_submit():
        try:
            cursor = mysql.connection.cursor()
            cursor.execute(
                "INSERT INTO cryptocurrency (name, symbol, coingecko_id, image_filename) "
                "VALUES (%s, %s, %s, %s)",
                (form.name.data, form.symbol.data, 
                 form.coingecko_id.data, form.image_filename.data)
            )
            mysql.connection.commit()
            cursor.close()
            flash('Cryptocurrency added successfully', 'success')
            return redirect(url_for('admin.manage_cryptos'))
        except pymysql.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
    
    return render_template('admin/cryptos/add.html', form=form)
@admin_bp.route('/cryptos/edit/<int:id>', methods=['GET', 'POST'])
def edit_crypto(id):
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM cryptocurrency WHERE id = %s", (id,))
    crypto = cursor.fetchone()
    
    if not crypto:
        flash('Cryptocurrency not found', 'danger')
        return redirect(url_for('admin.manage_cryptos'))
    
    form = CryptoForm(obj=crypto)
    
    if form.validate_on_submit():
        try:
            cursor.execute(
                "UPDATE cryptocurrency SET name = %s, symbol = %s, "
                "coingecko_id = %s, image_filename = %s WHERE id = %s",
                (form.name.data, form.symbol.data, 
                 form.coingecko_id.data, form.image_filename.data, id)
            )
            mysql.connection.commit()
            flash('Cryptocurrency updated successfully', 'success')
            return redirect(url_for('admin.manage_cryptos'))
        except pymysql.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
    
    cursor.close()
    return render_template('admin/cryptos/edit.html', form=form, crypto=crypto)
@admin_bp.route('/cryptos/delete/<int:id>')
def delete_crypto(id):
    if not is_admin_logged_in():
        return redirect(url_for('admin.admin_login'))
    
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("DELETE FROM cryptocurrency WHERE id = %s", (id,))
        mysql.connection.commit()
        cursor.close()
        flash('Cryptocurrency deleted successfully', 'success')
    except pymysql.Error as e:
        flash(f'Database error: {str(e)}', 'danger')
    
    return redirect(url_for('admin.manage_cryptos'))